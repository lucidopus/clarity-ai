import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User, { ILearningPreferences } from '@/lib/models/User';
import { generateEmbeddings } from '@/lib/embedding';
import { constructUserProfileString } from '@/lib/service-utils';

type LearningPreferencesPayload = Partial<ILearningPreferences> & Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: user.preferences || null,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const token = request.cookies.get('jwt')?.value;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const requestBody: LearningPreferencesPayload = await request.json();

    // Extract ONLY allowed learning preferences fields (ignore any extra fields from old onboarding steps or localStorage)
    const learningPreferences: Partial<ILearningPreferences> = {};

    // Only copy allowed fields
    if (requestBody.role !== undefined) learningPreferences.role = requestBody.role;
    if (requestBody.learningGoals !== undefined) learningPreferences.learningGoals = requestBody.learningGoals;
    if (requestBody.learningGoalText !== undefined) learningPreferences.learningGoalText = requestBody.learningGoalText;
    if (requestBody.learningChallenges !== undefined) learningPreferences.learningChallenges = requestBody.learningChallenges;
    if (requestBody.learningChallengesText !== undefined) learningPreferences.learningChallengesText = requestBody.learningChallengesText;
    if (requestBody.personalityProfile !== undefined) learningPreferences.personalityProfile = requestBody.personalityProfile;
    if (requestBody.preferredMaterialsRanked !== undefined) learningPreferences.preferredMaterialsRanked = requestBody.preferredMaterialsRanked;
    if (requestBody.dailyTimeMinutes !== undefined) learningPreferences.dailyTimeMinutes = requestBody.dailyTimeMinutes;

    // Validation for new onboarding flow
    if (!learningPreferences.learningGoals || learningPreferences.learningGoals.length === 0) {
      return NextResponse.json({ success: false, message: 'Learning goals are required' }, { status: 400 });
    }

    // Validate personality profile if present (all scores must be 1-7)
    if (learningPreferences.personalityProfile) {
      const { conscientiousness, emotionalStability, selfEfficacy, masteryOrientation, performanceOrientation } = learningPreferences.personalityProfile;

      const scores = [conscientiousness, emotionalStability, selfEfficacy, masteryOrientation, performanceOrientation];
      const allScoresValid = scores.every(score =>
        score !== undefined && score >= 1 && score <= 7
      );

      if (!allScoresValid) {
        return NextResponse.json({
          success: false,
          message: 'Personality profile scores must be between 1 and 7'
        }, { status: 400 });
      }
    }

    // Validate preferredMaterialsRanked (max 3 items)
    if (learningPreferences.preferredMaterialsRanked && learningPreferences.preferredMaterialsRanked.length > 3) {
      return NextResponse.json({
        success: false,
        message: 'Maximum 3 preferred materials allowed'
      }, { status: 400 });
    }

    // Validate dailyTimeMinutes (must be positive)
    if (learningPreferences.dailyTimeMinutes !== undefined && learningPreferences.dailyTimeMinutes < 0) {
      return NextResponse.json({
        success: false,
        message: 'Daily time must be a positive number'
      }, { status: 400 });
    }

    // Prepare update operation - save to preferences.learning
    const updateOperation: Record<string, unknown> = {
      $set: {
        'preferences.learning': learningPreferences
      },
      $unset: {
        // Unset ALL deprecated root-level fields (from old schema)
        'preferences.role': '',
        'preferences.learningGoals': '',
        'preferences.learningGoalText': '',
        'preferences.learningChallenges': '',
        'preferences.learningChallengesText': '',
        'preferences.personalityProfile': '',
        'preferences.preferredMaterialsRanked': '',
        'preferences.dailyTimeMinutes': '',
        'preferences.preferredContentTypes': '',
        'preferences.subjects': '',
        'preferences.expertiseLevel': '',
        'preferences.learningStyle': '',
        'preferences.technicalComfort': '',
        'preferences.accessibility': '',
        'preferences.timePreferences': '',
        'preferences.additionalPreferences': '',
        // Remove the duplicate generalPreferences field
        'preferences.generalPreferences': '',
        // Also unset any old fields that might be in preferences.general
        'preferences.general.accessibility': '',
        'preferences.general.notificationsEnabled': '',
        'preferences.general.dataPrivacyLevel': '',
      }
    };

    // --- RE-EMBEDDING LOGIC ---
    // If we are updating learning preferences, we must regenerate the user's vector profile.
    // This allows the recommendation engine to stay in sync with their latest goals.
    try {
      // 1. Construct the new "User Narrative" string
      const userProfileString = constructUserProfileString(learningPreferences);
      console.log('Constructed Profile String:', userProfileString); // DEBUG log

      // 2. Generate the 1536-dim vector
      // Note: This adds a small latency to the onboarding/save step, 
      // but saves us from complex background job coordination for single users.
      if (userProfileString) {
        const embedding = await generateEmbeddings(userProfileString);
        (updateOperation.$set as any)['preferences.embedding'] = embedding;
        console.log(`Generated embedding for User ${decoded.userId}. Vector length: ${embedding.length}`);
      } else {
        console.log('Skipping embedding: Profile string is empty.');
      }
    } catch (embedError) {
      console.error('Failed to generate user embedding:', embedError);
      // We do NOT block the save operation if embedding fails. 
      // The user still expects their settings to be saved.
      // We should ideally flag this for a retry job, but for now we log it.
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      updateOperation,
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences saved successfully',
      preferences: user.preferences,
    });
  } catch (error) {
    console.error('Save preferences error:', error);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

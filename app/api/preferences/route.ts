import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import User, { ILearningPreferences, IGeneralPreferences } from '@/lib/models/User';

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
    const learningPreferences: Partial<ILearningPreferences> = await request.json();

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
    const updateOperation: any = {
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
      }
    };

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
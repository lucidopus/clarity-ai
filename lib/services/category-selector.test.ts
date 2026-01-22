import { CategorySelector } from './category-selector';
import { CatalogVideo } from '../catalog';
import { IUser } from '../models/User';

// Mocks
const mockUser = (overrides: Partial<import('../models/User').ILearningPreferences> = {}): IUser => ({
  preferences: {
    learning: {
      role: 'Student',
      learningChallenges: [],
      preferredMaterialsRanked: [],
      dailyTimeMinutes: 30,
      ...overrides
    }
  }
} as unknown as IUser);

const mockVideo = (id: string, duration: number, tags: string[] = []): CatalogVideo => ({
  videoId: id,
  title: `Video ${id}`,
  durationSeconds: duration,
  tags,
  category: 'Education',
  score: 1.0,
  materialsStatus: 'complete'
});

describe('CategorySelector', () => {
    
  test('Time Match: Morning Kickstart wins in the morning', () => {
    const user = mockUser();
    const videos = [mockVideo('1', 300)]; // 5 min video fits Kickstart
    
    // 9 AM
    const morning = new Date('2024-01-01T09:00:00');
    const selection = CategorySelector.select(user, videos, morning);
    
    const morningCat = selection.find(s => s.category.id === 'morning_kickstart');
    const eveningCat = selection.find(s => s.category.id === 'evening_wind_down');
    
    expect(morningCat).toBeDefined();
    // Base score might vary but morning should have +50
    expect(morningCat!.score).toBeGreaterThanOrEqual(50); 
    
    // Evening should be missing or have much lower score (likely missing if not matched or 0 bonus)
    if (eveningCat) {
        expect(eveningCat.score).toBeLessThan(morningCat!.score);
    }
  });

  test('Time Match: Evening Wind-Down wins in the evening', () => {
    const user = mockUser();
    const videos = [mockVideo('1', 900)]; // 15 min video fits wind down
    
    // 9 PM (21:00)
    const evening = new Date('2024-01-01T21:00:00');
    const selection = CategorySelector.select(user, videos, evening);
    
    const eveningCat = selection.find(s => s.category.id === 'evening_wind_down');
    expect(eveningCat).toBeDefined();
    expect(eveningCat!.score).toBeGreaterThanOrEqual(50);
  });

  test('Role Match: Teacher gets Teachers Toolbox', () => {
    const user = mockUser({ role: 'Teacher' });
    const videos = [mockVideo('1', 300, ['teaching', 'education'])];
    
    const selection = CategorySelector.select(user, videos);
    const teacherCat = selection.find(s => s.category.id === 'teachers_toolbox');
    
    expect(teacherCat).toBeDefined();
    expect(teacherCat!.score).toBeGreaterThanOrEqual(40);
  });

  test('Challenge Match: Procrastinator gets Quick Wins', () => {
    const user = mockUser({ learningChallenges: ['procrastination'] });
    const videos = [mockVideo('1', 180)]; // 3 mins (< 5m)
    
    const selection = CategorySelector.select(user, videos);
    const quickWins = selection.find(s => s.category.id === 'quick_wins');
    
    expect(quickWins).toBeDefined();
    expect(quickWins!.score).toBeGreaterThanOrEqual(30);
  });

  test('Filter: Empty categories are removed', () => {
    const user = mockUser();
    // Video is very long (60m), so it won't fit "Quick Wins" (<5m)
    const videos = [mockVideo('1', 3600)]; 
    
    const selection = CategorySelector.select(user, videos);
    const quickWins = selection.find(s => s.category.id === 'quick_wins');
    
    expect(quickWins).toBeUndefined();
  });

  test('Format Match: Visual Learners get Mind Maps', () => {
      const user = mockUser({ preferredMaterialsRanked: ['Mind Maps'] });
      const videos = [mockVideo('1', 300, ['mind map'])];

      const selection = CategorySelector.select(user, videos);
      const visualCat = selection.find(s => s.category.id === 'visual_learning');

      expect(visualCat).toBeDefined();
      expect(visualCat!.score).toBeGreaterThanOrEqual(20);
  });

  test('Deduplication: Video appears only once in highest scoring category', () => {
      const user = mockUser();
      // Video matches both "Morning Kickstart" (5m) and "Quick Wins" (5m)
      const videos = [mockVideo('1', 300)];
      
      // Force Morning to win (9 AM) -> +50 score
      const morning = new Date('2024-01-01T09:00:00');
      const selection = CategorySelector.select(user, videos, morning);

      const morningCat = selection.find(s => s.category.id === 'morning_kickstart');
      const quickWins = selection.find(s => s.category.id === 'quick_wins');

      // Morning should win and take the video
      expect(morningCat).toBeDefined();
      expect(morningCat!.videos.length).toBe(1);

      // Quick Wins might exist as a category if it finds OTHER videos, but here we only have 1 video.
      // So Quick Wins should effectively be empty/removed because its only candidate was taken.
      expect(quickWins).toBeUndefined();
  });

  test('Fallback: Generates dynamic categories when Master Catalog is exhausted', () => {
      const user = mockUser();
      // Video is long (no quick match), matches no special tags.
      // Category is "Science".
      const videos: CatalogVideo[] = [{
          videoId: 'unknown_1',
          title: 'Cooking Session',
          durationSeconds: 0, // 0 duration avoids Time/Format matchers
          category: 'Cooking',
          tags: [],
          score: 0.5, // Low score avoids "Trending Now" / "Hall of Fame"
          createdAt: new Date('2020-01-01') // Old date to avoid "New Arrivals"
      }];
      
      const selection = CategorySelector.select(user, videos);
      
      // Should create a dynamic category for "Cooking"
      const cookingCat = selection.find(s => s.category.label === 'Cooking');

      expect(cookingCat).toBeDefined();
      expect(cookingCat!.videos.length).toBe(1);
      expect(cookingCat!.category.id).toContain('dynamic_cooking');
  });
});

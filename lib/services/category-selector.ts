import { MASTER_CATALOG, Category, CatalogVideo } from '@/lib/catalog';
import { IUser } from '@/lib/models/User';

export interface CategorySelection {
  category: Category;
  score: number;
  videos: CatalogVideo[];
}

export class CategorySelector {
  /**
   * Selects the top categories for a user based on context.
   * @param user The full user document (with preferences)
   * @param candidates The list of candidate videos (from Redis/Vector Search)
   * @param now Current date/time object
   * @param limit Number of categories to return (default 10)
   */
  static select(
    user: IUser,
    candidates: CatalogVideo[],
    now: Date = new Date(),
    limit: number = 10
  ): CategorySelection[] {
    const scoredCategories: CategorySelection[] = [];
    const preferences = user.preferences?.learning || {} as Partial<NonNullable<IUser['preferences']>['learning']>;
    
    // safe lookups
    const role = preferences?.role;
    const challenges = (preferences?.learningChallenges || []).map(c => c.toLowerCase());
    const materials = (preferences?.preferredMaterialsRanked || []).map(m => m.toLowerCase());
    const dailyTime = preferences?.dailyTimeMinutes || 30;

    // 4. Score all categories first
    const rankedCategories: { category: Category; score: number }[] = [];

    for (const cat of MASTER_CATALOG) {
      let score = 0;

      // A. Time Match (+50)
      if (this.isTimeMatch(cat.id, now)) score += 50;

      // B. Role Match (+40)
      if (cat.type === 'RoleSpecific' && this.isRoleMatch(cat.id, role)) score += 40;

      // C. Challenge Match (+30)
      if (cat.type === 'ProblemSolver' && this.isChallengeMatch(cat.id, challenges)) score += 30;

      // D. Content Match (+20)
      if (cat.type === 'Format' && this.isFormatMatch(cat.id, materials)) score += 20;

      // E. Base Boosts
      if (cat.type === 'Essential') score += 10; 
      if (cat.type === 'Community') score += 5;
      
      // F. Dynamic Context
      if (dailyTime <= 20 && cat.id === 'quick_wins') score += 50;
      if (dailyTime > 60 && ['deep_reads', 'weekend_deep_dive'].includes(cat.id)) score += 20;

      rankedCategories.push({ category: cat, score });
    }

    // 5. Sort Categories by Score (Desc)
    rankedCategories.sort((a, b) => b.score - a.score);

    // 6. Greedy Allocation (Deduplication)
    const usedVideoIds = new Set<string>();
    
    for (const { category, score } of rankedCategories) {
      if (scoredCategories.length >= limit) break;

      // Find matching videos that haven't been used
      const matching = candidates
        .filter(v => category.matcher(v) && !usedVideoIds.has(v.videoId || ''))
        .sort((a, b) => (b.score || 0) - (a.score || 0));

      if (matching.length > 0) {
        // Take top 10 unique for this category
        const selected = matching.slice(0, 10);
        
        // Mark as used
        selected.forEach(v => {
            if (v.videoId) usedVideoIds.add(v.videoId);
        });

        scoredCategories.push({
          category,
          score,
          videos: selected
        });
      }
    }
    
    return scoredCategories;
  }

  // --- Helper Matchers ---

  private static isTimeMatch(catId: string, now: Date): boolean {
    const hour = now.getHours(); // 0-23
    
    switch (catId) {
      case 'morning_kickstart':
        return hour >= 5 && hour < 11; // 5 AM - 11 AM
      case 'lunch_break':
        return hour >= 11 && hour < 14; // 11 AM - 2 PM
      case 'evening_wind_down':
        return hour >= 19 && hour < 23; // 7 PM - 11 PM
      case 'midnight_nuggets':
        return hour >= 23 || hour < 4; // 11 PM - 4 AM
      case 'weekend_deep_dive':
        const day = now.getDay(); // 0 = Sun, 6 = Sat
        return day === 0 || day === 6;
      default:
        return false;
    }
  }

  private static isRoleMatch(catId: string, role?: string): boolean {
    if (!role) return false;
    
    // Map catId to target roles
    const map: Record<string, string[]> = {
      'teachers_toolbox': ['Teacher'],
      'creators_studio': ['Content Creator'],
      'entrepreneur_essentials': ['Working Professional', 'Content Creator'], // Overlap
      'industry_standards': ['Working Professional'],
      'exam_crushers': ['Student'],
      'portfolio_projects': ['Student', 'Content Creator']
    };

    const targetRoles = map[catId];
    return targetRoles ? targetRoles.includes(role) : false;
  }

  private static isChallengeMatch(catId: string, challenges: string[]): boolean {
    // Map catId to solved challenges
    // Challenges: "procrastination", "retention", "information-overload", "lack-of-structure", "staying-motivated"
    
    const map: Record<string, string[]> = {
      'quick_wins': ['procrastination', 'time-management'],
      'essentials_only': ['information-overload'],
      'structured_paths': ['lack-of-structure'],
      'active_recall': ['retention'],
      'gap_filler': ['retention', 'academic-success'], // academic-success is a goal, but using here for fuzzy match implies 'struggling'
      'calm_clear': ['staying-motivated'] // Loose mapping for anxiety/stress if it existed, mapping to motivation for now
    };

    const targets = map[catId] || [];
    return targets.some(t => challenges.includes(t));
  }

  private static isFormatMatch(catId: string, materials: string[]): boolean {
    const map: Record<string, string[]> = {
      'flashcard_frenzy': ['flashcards'],
      'visual_learning': ['mind maps', 'mind map'],
      'interactive_sessions': ['quizzes', 'interactive'],
      'deep_reads': ['summaries', 'text']
    };

    const targets = map[catId] || [];
    return targets.some(t => materials.includes(t));
  }
}

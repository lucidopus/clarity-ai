import { IVideo } from './models/Video';

export type CategoryType = 
  | 'TimeAware' 
  | 'ProblemSolver' 
  | 'RoleSpecific' 
  | 'Format' 
  | 'Motivation' 
  | 'Community' 
  | 'Essential';

export interface CatalogVideo extends Partial<IVideo> {
  durationSeconds?: number; // Hydrated field
  score?: number; // Redis score
}

export interface Category {
  id: string;
  label: string;
  type: CategoryType;
  matcher: (video: CatalogVideo) => boolean;
}

// Helper to check tags/title case-insensitive
const hasTagOrInitial = (v: CatalogVideo, terms: string[]) => {
  const title = (v.title || '').toLowerCase();
  const tags = (v.tags || []).map(t => t.toLowerCase());
  const category = (v.category || '').toLowerCase();
  
  return terms.some(term => {
    const t = term.toLowerCase();
    return title.includes(t) || tags.includes(t) || category.includes(t);
  });
};

export const MASTER_CATALOG: Category[] = [
  // --- A. Time-Aware ---
  {
    id: 'morning_kickstart',
    label: 'Morning Kickstart',
    type: 'TimeAware',
    // < 15 mins (900s)
    matcher: v => (v.durationSeconds || 0) > 0 && (v.durationSeconds || 0) <= 900
  },
  {
    id: 'commute_quickies',
    label: 'Commute Quickies',
    type: 'TimeAware',
    // Audio friendly? Check tags or just short/medium duration? Let's say < 20m
    matcher: v => (v.durationSeconds || 0) > 0 && (v.durationSeconds || 0) <= 1200
  },
  {
    id: 'lunch_break',
    label: 'Lunch Break Learning',
    type: 'TimeAware',
    // 20-30 mins? Issue says 30 min. Let's say 15-40 mins.
    matcher: v => (v.durationSeconds || 0) > 900 && (v.durationSeconds || 0) <= 2400
  },
  {
    id: 'evening_wind_down',
    label: 'Evening Wind-Down',
    type: 'TimeAware',
    // Low intensity? Maybe longer, slower? Or just distinct from morning.
    // Let's us "Reflective" tags or valid duration. For now, match > 10m.
    matcher: v => (v.durationSeconds || 0) > 600
  },
  {
    id: 'weekend_deep_dive',
    label: 'Weekend Deep Dive',
    type: 'TimeAware',
    // 60m+
    matcher: v => (v.durationSeconds || 0) > 3600
  },
  {
    id: 'midnight_nuggets',
    label: 'Midnight Nuggets',
    type: 'TimeAware',
    // Short, fun? < 5m
    matcher: v => (v.durationSeconds || 0) > 0 && (v.durationSeconds || 0) <= 300
  },
  {
    id: 'habit_builder',
    label: 'Habit Builder',
    type: 'TimeAware',
    // Consistent length? 5-10m
    matcher: v => (v.durationSeconds || 0) >= 300 && (v.durationSeconds || 0) <= 600
  },

  // --- B. Problem Solvers ---
  {
    id: 'quick_wins',
    label: 'Quick Wins',
    type: 'ProblemSolver',
    // < 5m
    matcher: v => (v.durationSeconds || 0) > 0 && (v.durationSeconds || 0) <= 300
  },
  {
    id: 'essentials_only',
    label: 'Essentials Only',
    type: 'ProblemSolver',
    // High density = Summary exists + Short/Medium duration (< 15 min)
    matcher: v => !!v.summary && (v.durationSeconds || 0) <= 900
  },
  {
    id: 'structured_paths',
    label: 'Structured Paths',
    type: 'ProblemSolver',
    // Playlists? We don't have playlists yet. Tag 'series', 'part'?
    matcher: v => hasTagOrInitial(v, ['series', 'part', 'course', 'module'])
  },
  {
    id: 'active_recall',
    label: 'Active Recall',
    type: 'ProblemSolver',
    // Interactive / Quiz
    matcher: v => 
      (v.materialsStatus === 'complete' && !v.incompleteMaterials?.includes('quizzes')) ||
      hasTagOrInitial(v, ['quiz', 'test', 'exam'])
  },
  {
    id: 'gap_filler',
    label: 'Gap-Filler Modules',
    type: 'ProblemSolver',
    // Beginner / remedial?
    matcher: v => hasTagOrInitial(v, ['basics', 'introduction', '101', 'beginner', 'fundamental'])
  },
  {
    id: 'calm_clear',
    label: 'Calm & Clear',
    type: 'ProblemSolver',
    // Anxiety / Slow?
    matcher: v => hasTagOrInitial(v, ['meditation', 'mindset', 'calm', 'anxiety', 'stress', 'mental health'])
  },

  // --- C. Role-Specific ---
  {
    id: 'teachers_toolbox',
    label: "Teacher's Toolbox",
    type: 'RoleSpecific',
    matcher: v => hasTagOrInitial(v, ['education', 'teaching', 'pedagogy', 'classroom', 'student', 'school'])
  },
  {
    id: 'creators_studio',
    label: "Creator's Studio",
    type: 'RoleSpecific',
    matcher: v => hasTagOrInitial(v, ['design', 'art', 'editing', 'writing', 'creative', 'video', 'production'])
  },
  {
    id: 'entrepreneur_essentials',
    label: 'Entrepreneur Essentials',
    type: 'RoleSpecific',
    matcher: v => hasTagOrInitial(v, ['business', 'startup', 'finance', 'marketing', 'sales', 'growth', 'strategy'])
  },
  {
    id: 'exam_crushers',
    label: 'Exam Crushers',
    type: 'RoleSpecific',
    matcher: v => hasTagOrInitial(v, ['exam', 'study', 'test', 'review', 'revision', 'sat', 'gmat', 'finals']) // Targeted at students
  },
  {
    id: 'industry_standards',
    label: 'Industry Standards',
    type: 'RoleSpecific',
    matcher: v => hasTagOrInitial(v, ['best practice', 'professional', 'career', 'industry', 'standard']) // Professionals
  },
  {
    id: 'portfolio_projects',
    label: 'Portfolio Projects',
    type: 'RoleSpecific',
    matcher: v => hasTagOrInitial(v, ['project', 'build', 'tutorial', 'portfolio', 'case study'])
  },

  // --- D. Format ---
  {
    id: 'flashcard_frenzy',
    label: 'Flashcard Frenzy',
    type: 'Format',
    matcher: v => 
      (v.materialsStatus === 'complete' && !v.incompleteMaterials?.includes('flashcards'))
  },
  {
    id: 'visual_learning',
    label: 'Visual Learning',
    type: 'Format',
    matcher: v => 
      (v.materialsStatus === 'complete' && !v.incompleteMaterials?.includes('mindmap')) ||
      hasTagOrInitial(v, ['mind map', 'visual', 'diagram'])
  },
  {
    id: 'deep_reads',
    label: 'Deep Reads',
    type: 'Format',
    // Long form, reading? Maybe having a long transcript?
    matcher: v => (v.durationSeconds || 0) > 1200 // > 20 mins
  },
  {
    id: 'interactive_sessions',
    label: 'Interactive Sessions',
    type: 'Format',
    matcher: v => 
        (v.materialsStatus === 'complete' && !v.incompleteMaterials?.includes('quizzes'))
  },

  // --- E. Motivation ---
  {
    id: 'challenge_mode',
    label: 'Challenge Mode',
    type: 'Motivation',
    // Hard?
    matcher: v => hasTagOrInitial(v, ['advanced', 'expert', 'hard', 'challenge', 'complex'])
  },
  {
    id: 'mastery_series',
    label: 'Mastery Series',
    type: 'Motivation',
    matcher: v => hasTagOrInitial(v, ['mastery', 'complete guide', 'ultimate', 'deep dive', 'comprehensive'])
  },
  {
    id: 'result_focused',
    label: 'Result Focused',
    type: 'Motivation',
    matcher: v => hasTagOrInitial(v, ['how to', 'tutorial', 'guide', 'steps', 'actionable'])
  },
  {
    id: 'brain_food',
    label: 'Brain Food',
    type: 'Motivation',
    // Interesting, science, philosophy
    matcher: v => hasTagOrInitial(v, ['science', 'philosophy', 'interesting', 'why', 'explained', 'documentary'])
  },

  // --- F. Community (Proxies for now) ---
  {
    id: 'trending_now',
    label: 'Trending Now',
    type: 'Community',
    // Proxy: Newest? Or High Score?
    matcher: v => Boolean(v.score && v.score > 0.85) // High relevance score from Vector Search
  },
  {
    id: 'hall_of_fame',
    label: 'Hall of Fame',
    type: 'Community',
    // Proxy: Very High Score + Old?
    matcher: v => Boolean(v.score && v.score > 0.9)
  },
  {
    id: 'classmate_favorites',
    label: 'Classmate Favorites',
    type: 'Community',
    // Proxy: Random for now, or match role
    matcher: _v => false // Placeholder pending real logic
  },
  {
    id: 'undiscovered_gems',
    label: 'Undiscovered Gems',
    type: 'Community',
    // Just valid videos
    matcher: _v => false // Placeholder pending views data
  },
  {
    id: 'lessons_field',
    label: 'Lessons from the Field',
    type: 'Community',
    matcher: v => hasTagOrInitial(v, ['interpretation', 'interview', 'case study', 'talk', 'speech'])
  },

  // --- G. The Essentials ---
  {
    id: 'jump_back_in',
    label: 'Jump Back In',
    type: 'Essential',
    // Logic for this is usually handled by Recent History, not candidates pool.
    // Selector might inject this separately. But if candidates *include* history:
    matcher: _v => false // Placeholder, usually special logic
  },
  {
    id: 'picked_for_goal',
    label: 'Picked for Your Goal',
    type: 'Essential',
    // Match goal keywords?
    matcher: _v => false // Placeholder pending vector match logic
  },
  {
    id: 'because_you_watched',
    label: 'Because you watched...',
    type: 'Essential',
    matcher: _v => false // Placeholder
  },
  {
    id: 'new_arrivals',
    label: 'New Arrivals',
    type: 'Essential',
    // Recent?
    matcher: v => {
        if (!v.createdAt) return false;
        const date = new Date(v.createdAt);
        const now = new Date();
        const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
        return diffDays < 7;
    }
  },
  {
    id: 'from_library',
    label: 'From Your Library',
    type: 'Essential',
    matcher: _v => false // Placeholder
  },
  {
    id: 'spaced_repetition',
    label: 'Spaced Repetition',
    type: 'Essential',
    matcher: _v => false // Placeholder
  }
];

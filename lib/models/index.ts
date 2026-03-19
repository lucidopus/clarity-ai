export { default as User, type IUser } from './User';
// Legacy — still used by existing codebase, will be removed in Phase A (videoId → sourceId rename)
export { default as Video, type IVideo, type ITranscriptSegment } from './Video';
// New multi-source models
export { default as Source, type ISource, type SourceType } from './Source';
export { default as SourceContent, type ISourceContent, type ISegment } from './SourceContent';
export { default as LearningMaterial, type ILearningMaterial, type IChapter, type IPrerequisite, type IRealWorldProblem } from './LearningMaterial';
export { default as Flashcard, type IFlashcard } from './Flashcard';
export { default as Quiz, type IQuiz } from './Quiz';
export { default as Progress, type IProgress, type IQuizAttempt } from './Progress';
export { default as ActivityLog, type IActivityLog, type ActivityType } from './ActivityLog';
export { default as Note } from './Note';
export type { INote } from '@/lib/types/notes';
export { default as MindMap, type IMindMap, type IMindMapNode, type IMindMapEdge } from './MindMap';
export { default as Solution, type ISolution } from './Solution';
export { default as Cost, type ICost, type IServiceUsage, type IUnitDetails, ServiceType } from './Cost';
export { default as SystemLog, type ISystemLog, type SystemLogCategory, type SystemLogDecision } from './SystemLog';

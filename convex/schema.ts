import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // Custom fields for Edunexus
    role: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("teacher"),
        v.literal("student"),
        v.literal("parent")
      )
    ),
    isActive: v.optional(v.boolean()),
    studentClass: v.optional(v.id("classes")),
    teacherSubject: v.optional(v.array(v.id("subjects"))),
    linkedStudent: v.optional(v.id("users")), // for parents
    bio: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
  }).index("email", ["email"]),

  academicYears: defineTable({
    name: v.string(),
    fromYear: v.string(),
    toYear: v.string(),
    isCurrent: v.boolean(),
  }),

  classes: defineTable({
    name: v.string(),
    academicYear: v.id("academicYears"),
    classTeacher: v.optional(v.id("users")),
    subjects: v.array(v.id("subjects")),
    students: v.array(v.id("users")),
    capacity: v.number(),
  }).index("by_name_year", ["name", "academicYear"]),

  subjects: defineTable({
    name: v.string(),
    code: v.string(),
    teacher: v.optional(v.array(v.id("users"))),
    isActive: v.boolean(),
    // Category determines which question types are recommended
    // "maths", "science", "language", "humanities", "life_skills", "arts", "technology", "other"
    category: v.optional(v.string()),
    grade: v.optional(v.number()),
  }).index("by_code", ["code"])
    .index("by_category", ["category"]),

  timetables: defineTable({
    class: v.id("classes"),
    academicYear: v.id("academicYears"),
    schedule: v.array(
      v.object({
        day: v.string(),
        periods: v.array(
          v.object({
            subject: v.optional(v.id("subjects")),
            teacher: v.optional(v.id("users")),
            startTime: v.string(),
            endTime: v.string(),
            type: v.optional(v.string()),
            isBreak: v.optional(v.boolean()),
            label: v.optional(v.string()),
          })
        ),
      })
    ),
    overrides: v.optional(
      v.array(
        v.object({
          date: v.string(), // ISO "YYYY-MM-DD"
          label: v.optional(v.string()),
          periods: v.array(
            v.object({
              subject: v.optional(v.id("subjects")),
              teacher: v.optional(v.id("users")),
              startTime: v.string(),
              endTime: v.string(),
              type: v.optional(v.string()),
              isBreak: v.optional(v.boolean()),
              label: v.optional(v.string()),
            })
          ),
        })
      )
    ),
  }),

  exams: defineTable({
    title: v.string(),
    subject: v.id("subjects"),
    class: v.id("classes"),
    teacher: v.id("users"),
    duration: v.number(),
    dueDate: v.string(),
    isActive: v.boolean(),
    // "quiz" = self-paced student practice, "exam" = formal timed assessment
    examType: v.optional(v.union(v.literal("quiz"), v.literal("exam"))),
    // For quizzes: allow multiple attempts
    maxAttempts: v.optional(v.number()),
    // For quizzes: show instant feedback after each question
    instantFeedback: v.optional(v.boolean()),
    // Syllabus topics this exam covers
    syllabusTopics: v.optional(v.array(v.string())),
    // Subject category for question type recommendations
    subjectCategory: v.optional(v.string()),
    // Total points (computed)
    totalPoints: v.optional(v.number()),
    // Exam template used (if any)
    templateUsed: v.optional(v.string()),
    
    // South African Assessment attributes
    capsPhase: v.optional(v.union(v.literal("Senior"), v.literal("FET"))),
    grade: v.optional(v.number()),
    southAfricanExamType: v.optional(v.string()),
    
    questions: v.array(
      v.object({
        questionText: v.string(),
        type: v.union(
          v.literal("MCQ"),
          v.literal("SHORT_ANSWER"),
          v.literal("ESSAY"),
          v.literal("TRUE_FALSE"),
          v.literal("FILL_BLANK"),
          v.literal("MATCH_COLUMN"),
          v.literal("CALCULATION"),
          v.literal("DIAGRAM_LABEL")
        ),
        options: v.optional(v.array(v.string())),
        correctAnswer: v.string(),
        points: v.number(),
        // Which syllabus topic this question tests
        topic: v.optional(v.string()),
        // Difficulty per question
        difficulty: v.optional(v.string()),
        // For MATCH_COLUMN: pairs of items
        matchPairs: v.optional(v.array(v.object({ left: v.string(), right: v.string() }))),
        // For DIAGRAM_LABEL: image URL
        diagramUrl: v.optional(v.string()),
        // Source question bank ID if reused
        bankQuestionId: v.optional(v.string()),
        
        // Bilingual and CAPS additions
        questionTextZulu: v.optional(v.string()),
        questionTextAfrikaans: v.optional(v.string()),
        optionsZulu: v.optional(v.array(v.string())),
        optionsAfrikaans: v.optional(v.array(v.string())),
        correctAnswerZulu: v.optional(v.string()),
        correctAnswerAfrikaans: v.optional(v.string()),
        cognitiveLevel: v.optional(v.string()), // e.g. "knowledge" | "routine" | "complex" | "problem_solving"
        diagramHotspots: v.optional(v.array(v.object({ label: v.string(), x: v.number(), y: v.number() }))),
      })
    ),
  }).index("by_type", ["examType"])
    .index("by_teacher_type", ["teacher", "examType"])
    .index("by_class_type", ["class", "examType"]),

  examArenas: defineTable({
    exam: v.id("exams"),
    status: v.union(v.literal("waiting"), v.literal("active"), v.literal("completed")),
    code: v.string(),
    host: v.id("users"),
    startedAt: v.optional(v.number()),
    duration: v.number(),
    participants: v.array(
      v.object({
        studentId: v.id("users"),
        name: v.string(),
        avatar: v.optional(v.string()),
        progress: v.number(), // index of current/last answered question
        score: v.number(),
        completedAt: v.optional(v.number()),
      })
    ),
  }).index("by_code", ["code"]).index("by_status", ["status"]),

  submissions: defineTable({
    exam: v.id("exams"),
    student: v.id("users"),
    answers: v.array(
      v.object({
        questionId: v.string(),
        answer: v.string(),
      })
    ),
    score: v.number(),
    aiFeedback: v.optional(v.string()),
    // Track attempt number for quizzes
    attemptNumber: v.optional(v.number()),
  }),

  // Reusable question bank — questions generated or manually added
  questionBank: defineTable({
    questionText: v.string(),
    type: v.union(
      v.literal("MCQ"),
      v.literal("SHORT_ANSWER"),
      v.literal("ESSAY"),
      v.literal("TRUE_FALSE"),
      v.literal("FILL_BLANK"),
      v.literal("MATCH_COLUMN"),
      v.literal("CALCULATION"),
      v.literal("DIAGRAM_LABEL")
    ),
    options: v.optional(v.array(v.string())),
    correctAnswer: v.string(),
    points: v.number(),
    topic: v.optional(v.string()),
    subTopic: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    subject: v.optional(v.id("subjects")),
    grade: v.optional(v.number()),
    matchPairs: v.optional(v.array(v.object({ left: v.string(), right: v.string() }))),
    diagramUrl: v.optional(v.string()),
    createdBy: v.id("users"),
    timesUsed: v.optional(v.number()),
    tags: v.array(v.string()),
    isPublished: v.boolean(),
    
    // Bilingual and CAPS additions
    questionTextZulu: v.optional(v.string()),
    questionTextAfrikaans: v.optional(v.string()),
    optionsZulu: v.optional(v.array(v.string())),
    optionsAfrikaans: v.optional(v.array(v.string())),
    correctAnswerZulu: v.optional(v.string()),
    correctAnswerAfrikaans: v.optional(v.string()),
    cognitiveLevel: v.optional(v.string()),
    diagramHotspots: v.optional(v.array(v.object({ label: v.string(), x: v.number(), y: v.number() }))),
  }).index("by_subject", ["subject"])
    .index("by_topic", ["topic"])
    .index("by_type", ["type"])
    .index("by_created_by", ["createdBy"])
    .index("by_published", ["isPublished"]),

  // Exam templates for quick generation
  examTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    // Template config
    examType: v.union(v.literal("quiz"), v.literal("exam")),
    defaultDuration: v.number(),
    defaultQuestionCount: v.number(),
    questionTypeMix: v.array(v.object({
      type: v.string(),
      count: v.number(),
      points: v.number(),
    })),
    defaultDifficulty: v.string(),
    // Which subject categories this template is best for
    recommendedFor: v.array(v.string()),
    isSystem: v.boolean(), // built-in vs custom
    createdBy: v.optional(v.id("users")),
  }).index("by_type", ["examType"])
    .index("by_system", ["isSystem"]),

  activitieslog: defineTable({
    user: v.id("users"),
    action: v.string(),
    details: v.optional(v.string()),
  }),

  attendance: defineTable({
    student: v.id("users"),
    class: v.id("classes"),
    date: v.string(),
    status: v.union(v.literal("present"), v.literal("absent"), v.literal("late")),
    remarks: v.optional(v.string()),
  }).index("by_date_class", ["date", "class"])
    .index("by_student", ["student"]),

  assignments: defineTable({
    title: v.string(),
    description: v.string(),
    subject: v.id("subjects"),
    class: v.id("classes"),
    teacher: v.id("users"),
    dueDate: v.string(),
    fileUrl: v.optional(v.string()),
    maxPoints: v.optional(v.number()),
  }),

  assignmentSubmissions: defineTable({
    assignment: v.id("assignments"),
    student: v.id("users"),
    content: v.string(),
    fileUrl: v.optional(v.string()),
    submittedAt: v.number(),
    grade: v.optional(v.number()),
    feedback: v.optional(v.string()),
    aiFeedback: v.optional(v.string()),
    status: v.union(v.literal("submitted"), v.literal("graded"), v.literal("returned")),
  }).index("by_assignment", ["assignment"])
    .index("by_student", ["student"]),

  materials: defineTable({
    title: v.string(),
    description: v.string(),
    subject: v.id("subjects"),
    teacher: v.id("users"),
    fileUrl: v.string(),
    fileType: v.string(),
    // For RAG / AI search
    extractedText: v.optional(v.string()),
  }).index("by_subject", ["subject"]),

  fees: defineTable({
    student: v.id("users"),
    amount: v.number(),
    dueDate: v.string(),
    paidDate: v.optional(v.string()),
    status: v.union(v.literal("paid"), v.literal("pending"), v.literal("overdue")),
    academicYear: v.id("academicYears"),
    description: v.optional(v.string()),
  }).index("by_student", ["student"]),

  expenses: defineTable({
    title: v.string(),
    amount: v.number(),
    date: v.string(),
    category: v.string(),
    receipt: v.optional(v.string()),
  }),

  schoolSettings: defineTable({
    name: v.string(),
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    logo: v.optional(v.string()),
    motto: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
  }),

  // ─── NEW TABLES ───────────────────────────────────────────────

  notifications: defineTable({
    recipient: v.id("users"),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    type: v.string(), // "exam", "attendance", "fee", "assignment", "message", "badge", "announcement"
    link: v.optional(v.string()),
  }).index("by_recipient", ["recipient"])
    .index("by_recipient_read", ["recipient", "isRead"]),

  announcements: defineTable({
    title: v.string(),
    content: v.string(),
    author: v.id("users"),
    targetRoles: v.array(v.string()), // ["student", "teacher", "parent"] or ["all"]
    priority: v.union(v.literal("low"), v.literal("normal"), v.literal("urgent")),
    expiresAt: v.optional(v.string()),
  }).index("by_priority", ["priority"]),

  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    date: v.string(),
    endDate: v.optional(v.string()),
    type: v.union(
      v.literal("exam"),
      v.literal("sports"),
      v.literal("holiday"),
      v.literal("meeting"),
      v.literal("other")
    ),
    targetRoles: v.optional(v.array(v.string())),
    createdBy: v.id("users"),
  }).index("by_date", ["date"]),

  badges: defineTable({
    student: v.id("users"),
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    category: v.string(), // "attendance", "academic", "participation"
    awardedAt: v.number(),
  }).index("by_student", ["student"]),

  messages: defineTable({
    sender: v.id("users"),
    recipient: v.id("users"),
    content: v.string(),
    isRead: v.boolean(),
    subject: v.optional(v.string()),
    conversationId: v.string(), // sorted pair of user IDs: "id1_id2"

    // NEW: Rich chat features
    replyTo: v.optional(v.id("messages")),
    messageType: v.optional(v.union(
      v.literal("text"),
      v.literal("file"),
      v.literal("image"),
      v.literal("voice"),
      v.literal("system"),
      v.literal("assignment"),
      v.literal("exam")
    )),
    fileUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    fileType: v.optional(v.string()),
    // CAPS curriculum context
    curriculumTopic: v.optional(v.string()),
    curriculumSubject: v.optional(v.string()),
    curriculumGrade: v.optional(v.number()),
  }).index("by_conversation", ["conversationId"])
    .index("by_recipient_read", ["recipient", "isRead"])
    .index("by_sender", ["sender"]),

  learningPaths: defineTable({
    student: v.id("users"),
    plan: v.string(), // JSON string from AI
    generatedAt: v.number(),
    academicYear: v.id("academicYears"),
  }).index("by_student", ["student"]),

  gradeInsights: defineTable({
    exam: v.id("exams"),
    teacher: v.id("users"),
    summary: v.string(),
    weakAreas: v.array(v.string()),
    strongAreas: v.array(v.string()),
    recommendedActions: v.array(v.string()),
    generatedAt: v.number(),
  }).index("by_exam", ["exam"]),

  // ─── CAPS CURRICULUM & RESOURCE TABLES ────────────────────────

  // Official South African languages
  languages: defineTable({
    name: v.string(),           // "English", "isiZulu", "Afrikaans", etc.
    code: v.string(),           // "en", "zu", "af", etc.
    isOfficial: v.boolean(),    // all 11 are official
  }).index("by_code", ["code"]),

  // CAPS-aligned subject definitions per grade
  capsSubjects: defineTable({
    name: v.string(),           // "Mathematics", "Life Skills", etc.
    code: v.string(),           // "MATH", "LIFE-SKILLS"
    grade: v.number(),          // 1-12
    phase: v.string(),          // "Foundation", "Intermediate", "Senior", "FET"
    description: v.optional(v.string()),
    isCompulsory: v.boolean(),
    isLanguage: v.boolean(),    // true for language subjects
  }).index("by_grade", ["grade"])
    .index("by_code_grade", ["code", "grade"]),

  // Syllabus topics per subject per grade
  syllabusTopics: defineTable({
    capsSubject: v.id("capsSubjects"),
    grade: v.number(),
    term: v.number(),           // 1-4
    topic: v.string(),          // "Numbers, Operations and Relationships"
    subTopics: v.array(v.string()), // ["Counting", "Addition", "Subtraction"]
    contentOutline: v.string(), // Detailed CAPS content description
    hoursPerTerm: v.number(),   // suggested teaching hours
    language: v.string(),       // "en", "zu", "af" etc — the language of this content
  }).index("by_subject_term", ["capsSubject", "term"])
    .index("by_grade_language", ["grade", "language"]),

  // Past exam papers
  pastPapers: defineTable({
    title: v.string(),          // "Grade 12 Mathematics Paper 1 — November 2024"
    grade: v.number(),
    subject: v.id("capsSubjects"),
    language: v.string(),       // language code
    year: v.number(),
    term: v.number(),           // 1-4, or 0 for full-year
    paperType: v.string(),      // "exam", "test", "assignment", "memo"
    fileUrl: v.string(),
    fileType: v.string(),       // "pdf", "docx"
    fileSize: v.number(),       // bytes
    extractedText: v.optional(v.string()), // OCR'd text for AI search
    uploadedBy: v.id("users"),
    isPublished: v.boolean(),   // only visible when published
    tags: v.array(v.string()),  // ["calculus", "trigonometry", "exam"]
  }).index("by_grade_subject", ["grade", "subject"])
    .index("by_year", ["year"])
    .index("by_published", ["isPublished"]),

  // Study materials / teaching resources (admin-uploaded)
  studyResources: defineTable({
    title: v.string(),
    description: v.string(),
    grade: v.number(),
    subject: v.id("capsSubjects"),
    language: v.string(),
    resourceType: v.string(),   // "notes", "worksheet", "video", "presentation", "textbook"
    fileUrl: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    extractedText: v.optional(v.string()),
    uploadedBy: v.id("users"),
    isPublished: v.boolean(),
    tags: v.array(v.string()),
  }).index("by_grade_subject", ["grade", "subject"])
    .index("by_type", ["resourceType"])
    .index("by_published", ["isPublished"]),

  // AI-generated exam drafts linked to syllabus
  generatedExams: defineTable({
    title: v.string(),
    grade: v.number(),
    subject: v.id("capsSubjects"),
    language: v.string(),
    term: v.number(),
    questions: v.array(
      v.object({
        questionText: v.string(),
        type: v.union(v.literal("MCQ"), v.literal("SHORT_ANSWER"), v.literal("ESSAY")),
        options: v.optional(v.array(v.string())),
        correctAnswer: v.string(),
        points: v.number(),
        topic: v.string(),      // which syllabus topic this tests
        difficulty: v.string(), // "easy", "medium", "hard"
      })
    ),
    totalPoints: v.number(),
    duration: v.number(),       // minutes
    generatedBy: v.id("users"),
    basedOnTopics: v.array(v.id("syllabusTopics")),
    isFinalized: v.boolean(),
  }).index("by_grade_subject", ["grade", "subject"])
    .index("by_generated_by", ["generatedBy"]),

  // ─── LIVE CLASSES ──────────────────────────────────────────────

  liveClasses: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    subject: v.id("subjects"),
    class: v.optional(v.id("classes")),
    teacher: v.id("users"),
    // When the class starts
    startTime: v.number(), // epoch ms
    endTime: v.optional(v.number()), // epoch ms
    // Platform: "youtube", "zoom", "jitsi", "stream"
    platform: v.string(),
    // Join link (public for students)
    joinUrl: v.string(),
    // Recording URL (after class ends)
    recordingUrl: v.optional(v.string()),
    streamVideoUid: v.optional(v.string()),
    playbackUrl: v.optional(v.string()),
    roomId: v.optional(v.string()),
    accessMode: v.optional(v.union(
      v.literal("school-only"),
      v.literal("school-and-public"),
      v.literal("public-support")
    )),
    whepUrl: v.optional(v.string()),
    whipUrl: v.optional(v.string()),
    streamInputId: v.optional(v.string()),
    resourceUrls: v.optional(v.array(v.string())),
    lessonPlan: v.optional(v.string()),
    // Status: "scheduled", "live", "ended", "cancelled"
    status: v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("ended"),
      v.literal("cancelled")
    ),
    // Which grades can see this (empty = all)
    targetGrades: v.optional(v.array(v.number())),
    // Max participants (0 = unlimited)
    maxParticipants: v.optional(v.number()),
    // Auto-notify
    notifyEnrolled: v.boolean(),
  }).index("by_status", ["status"])
    .index("by_subject", ["subject"])
    .index("by_start_time", ["startTime"])
    .index("by_teacher", ["teacher"]),

  // Student attendance for live classes
  liveClassAttendance: defineTable({
    liveClass: v.id("liveClasses"),
    student: v.id("users"),
    joinedAt: v.optional(v.number()),
    leftAt: v.optional(v.number()),
    duration: v.optional(v.number()), // ms
    watchPercentage: v.optional(v.number()), // for recordings
  }).index("by_class", ["liveClass"])
    .index("by_student", ["student"]),

  // Waiting Room Approvals
  liveClassApprovals: defineTable({
    liveClassId: v.id("liveClasses"),
    studentId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("denied")),
    requestedAt: v.number(),
  }).index("by_class", ["liveClassId"])
    .index("by_student", ["studentId"])
    .index("by_class_and_student", ["liveClassId", "studentId"])
    .index("by_class_and_status", ["liveClassId", "status"]),

  // Live Class Reactions (Emojis)
  liveClassReactions: defineTable({
    liveClassId: v.id("liveClasses"),
    studentId: v.id("users"),
    type: v.string(), // "like", "love", etc.
    timestamp: v.number(),
  }).index("by_class_and_time", ["liveClassId", "timestamp"]),

  // ─── VIDEO LIBRARY ─────────────────────────────────────────────

  videoLibrary: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    subject: v.id("subjects"),
    teacher: v.id("users"),
    // Video URL (YouTube embed, R2 direct, or external)
    videoUrl: v.string(),
    videoType: v.union(v.literal("youtube"), v.literal("r2"), v.literal("external")),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.number()), // seconds
    grade: v.optional(v.number()),
    topic: v.optional(v.string()),
    // Tags for search
    tags: v.array(v.string()),
    // Syllabus topic link
    syllabusTopic: v.optional(v.id("syllabusTopics")),
    // Playlist / series
    playlist: v.optional(v.string()),
    playlistOrder: v.optional(v.number()),
    viewCount: v.number(),
    isPublished: v.boolean(),
  }).index("by_subject", ["subject"])
    .index("by_grade", ["grade"])
    .index("by_teacher", ["teacher"])
    .index("by_playlist", ["playlist"])
    .index("by_published", ["isPublished"]),

  // Student video watch progress
  videoProgress: defineTable({
    video: v.id("videoLibrary"),
    student: v.id("users"),
    progress: v.number(), // seconds watched
    percentage: v.number(), // 0-100
    completed: v.boolean(),
    lastWatchedAt: v.number(),
  }).index("by_video", ["video"])
    .index("by_student", ["student"]),

  // ─── MESSAGE REACTIONS ────────────────────────────────────────
  messageReactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  }).index("by_message", ["messageId"])
    .index("by_user_message", ["userId", "messageId"]),

  // ─── CURRICULUM CHAT HISTORY ─────────────────────────────────
  curriculumChats: defineTable({
    userId: v.id("users"),
    topic: v.string(),
    question: v.string(),
    answer: v.string(),
    subject: v.optional(v.string()),
    grade: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_subject", ["subject"]),

  // ─── GAMIFICATION ──────────────────────────────────────────────

  // XP and level per student
  studentXP: defineTable({
    student: v.id("users"),
    totalXP: v.number(),
    level: v.number(),
    currentStreak: v.number(), // consecutive days
    longestStreak: v.number(),
    lastActivityDate: v.optional(v.string()), // "YYYY-MM-DD"
    // Weekly XP for leaderboards
    weeklyXP: v.number(),
    weeklyResetAt: v.number(),
    // Custom avatar/theme unlocks
    unlockedItems: v.array(v.string()),
    // Student-chosen display title
    displayTitle: v.optional(v.string()),
  }).index("by_student", ["student"])
    .index("by_total_xp", ["totalXP"]),

  // XP transaction log
  xpLog: defineTable({
    student: v.id("users"),
    amount: v.number(),
    reason: v.string(),
    source: v.string(), // "video_watch", "class_attend", "exam_complete", "daily_login", "streak_badge"
    referenceId: v.optional(v.string()), // e.g. video ID or class ID
  }).index("by_student", ["student"]),

  // Achievements / extended badges
  achievements: defineTable({
    student: v.id("users"),
    achievementId: v.string(), // "first_video", "streak_7", "top_of_class", etc.
    title: v.string(),
    description: v.string(),
    icon: v.string(),
    xpReward: v.number(),
    unlockedAt: v.number(),
    tier: v.union(v.literal("bronze"), v.literal("silver"), v.literal("gold"), v.literal("platinum")),
  }).index("by_student", ["student"]),
  // leaderboard snapshots (weekly)
  leaderboard: defineTable({
    period: v.string(), // "weekly_2026_W22"
    category: v.string(), // "global", "grade_10", "class_id"
    entries: v.array(v.object({
      student: v.id("users"),
      name: v.string(),
      xp: v.number(),
      level: v.number(),
      rank: v.number(),
    })),
    computedAt: v.number(),
  }).index("by_period", ["period"]),

  // ─── STUDY GROUPS ──────────────────────────────────────────────

  studyGroups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    subject: v.id("subjects"),
    creator: v.id("users"),
    members: v.array(v.id("users")),
    maxMembers: v.number(),
    isPrivate: v.boolean(),
    inviteCode: v.optional(v.string()),
    grade: v.optional(v.number()),
  }).index("by_subject", ["subject"])
    .index("by_creator", ["creator"])
    .index("by_grade", ["grade"]),

  studyGroupMessages: defineTable({
    group: v.id("studyGroups"),
    sender: v.id("users"),
    content: v.string(),
    // Teacher can pin messages
    isPinned: v.boolean(),
    // For shared files/resources
    attachmentUrl: v.optional(v.string()),
    attachmentName: v.optional(v.string()),
  }).index("by_group", ["group"]),

  // ─── USER PREFERENCES ──────────────────────────────────────────

  userPreferences: defineTable({
    student: v.id("users"),
    language: v.string(), // "en", "nso", "ts", "ve", "zu", "af"
    // Data saver mode for low bandwidth
    dataSaverMode: v.boolean(),
    lowBandwidthMode: v.boolean(),
    // Notification prefs
    emailNotifications: v.boolean(),
    pushNotifications: v.boolean(),
    whatsappNotifications: v.boolean(),
    whatsappNumber: v.optional(v.string()),
    // Theme: "light", "dark", "system"
    theme: v.string(),
    // Grade info for students
    grade: v.optional(v.number()),
    province: v.optional(v.string()), // "limpopo"
    schoolName: v.optional(v.string()),
  }).index("by_student", ["student"]),

  // ─── NOTIFICATIONS QUEUE (for WA/SMS) ──────────────────────────

  notificationQueue: defineTable({
    recipient: v.id("users"),
    type: v.string(), // "class_reminder", "assignment_due", "fee_balance", "study_tip"
    channel: v.string(), // "in_app", "whatsapp", "sms", "email"
    content: v.string(),
    scheduledFor: v.number(),
    sentAt: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
  }).index("by_status", ["status"])
    .index("by_recipient", ["recipient"]),

  // ─── PEER TUTORING ─────────────────────────────────────────────

  tutoringRequests: defineTable({
    student: v.id("users"),
    subject: v.id("subjects"),
    topic: v.string(),
    description: v.string(),
    status: v.union(v.literal("open"), v.literal("matched"), v.literal("closed")),
    matchedTutor: v.optional(v.id("users")),
    grade: v.number(),
  }).index("by_status", ["status"])
    .index("by_subject", ["subject"]),

  // ─── AI HOMEWORK CHECKER ───────────────────────────────────────

  homeworkSubmissions: defineTable({
    student: v.id("users"),
    subject: v.id("subjects"),
    question: v.string(),
    // Photo upload URL
    imageUrl: v.optional(v.string()),
    // Student's written answer
    studentAnswer: v.optional(v.string()),
    // AI-generated feedback
    aiScore: v.optional(v.number()),
    aiFeedback: v.optional(v.string()),
    aiCorrectAnswer: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("graded")),
    teacherReview: v.optional(v.string()),
  }).index("by_student", ["student"])
    .index("by_subject", ["subject"]),
});

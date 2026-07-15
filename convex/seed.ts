import { mutation } from "./_generated/server";

export const seedAll = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear existing data first
    const allUsers = await ctx.db.query("users").collect();
    for (const u of allUsers) await ctx.db.delete(u._id);
    
    // Clear auth tables to prevent orphaned credentials crashing login
    const authAccounts = await ctx.db.query("authAccounts" as any).collect();
    for (const a of authAccounts) await ctx.db.delete(a._id);
    const sessions = await ctx.db.query("authSessions" as any).collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    const credentials = await ctx.db.query("authCredentials" as any).collect();
    for (const c of credentials) await ctx.db.delete(c._id);
    const verifications = await ctx.db.query("authVerifications" as any).collect();
    for (const v of verifications) await ctx.db.delete(v._id);
    const verificationCodes = await ctx.db.query("authVerificationCodes" as any).collect();
    for (const c of verificationCodes) await ctx.db.delete(c._id);
    const allSubjects = await ctx.db.query("subjects").collect();
    for (const s of allSubjects) await ctx.db.delete(s._id);
    const allClasses = await ctx.db.query("classes").collect();
    for (const c of allClasses) await ctx.db.delete(c._id);
    const allYears = await ctx.db.query("academicYears").collect();
    for (const y of allYears) await ctx.db.delete(y._id);
    const allMaterials = await ctx.db.query("materials").collect();
    for (const m of allMaterials) await ctx.db.delete(m._id);
    const allAnnouncements = await ctx.db.query("announcements").collect();
    for (const a of allAnnouncements) await ctx.db.delete(a._id);
    const allAssignments = await ctx.db.query("assignments").collect();
    for (const a of allAssignments) await ctx.db.delete(a._id);
    const allExams = await ctx.db.query("exams").collect();
    for (const e of allExams) await ctx.db.delete(e._id);
    const allEvents = await ctx.db.query("events").collect();
    for (const e of allEvents) await ctx.db.delete(e._id);
    const allBadges = await ctx.db.query("badges").collect();
    for (const b of allBadges) await ctx.db.delete(b._id);
    const allFees = await ctx.db.query("fees").collect();
    for (const f of allFees) await ctx.db.delete(f._id);
    const allTimetables = await ctx.db.query("timetables").collect();
    for (const t of allTimetables) await ctx.db.delete(t._id);

    // 1. Academic Year
    const yearId = await ctx.db.insert("academicYears", {
      name: "2026 Academic Year",
      fromYear: "2026",
      toYear: "2026",
      isCurrent: true,
    });

    // 2. Subjects (CAPS-aligned)
    const subjects = [
      { name: "Mathematics", code: "MATH101" },
      { name: "Mathematical Literacy", code: "MATHLIT101" },
      { name: "Physical Sciences", code: "SCI101" },
      { name: "English Home Language", code: "ENG101" },
      { name: "Afrikaans First Additional Language", code: "AFR101" },
      { name: "Life Orientation", code: "LO101" },
      { name: "History", code: "HIST101" },
      { name: "Geography", code: "GEO101" },
      { name: "Economic Sciences", code: "ECON101" },
      { name: "Technology", code: "TECH101" },
      { name: "Natural Sciences", code: "NATSCI101" },
    ];
    const subjectIds: Record<string, any> = {};
    for (const s of subjects) {
      subjectIds[s.code] = await ctx.db.insert("subjects", { name: s.name, code: s.code, isActive: true });
    }

    // 3. Teachers
    const teachers = [
      { name: "Mr. Thabo Mokoena", email: "thabo@edunexus.edu", subjects: ["MATH101", "SCI101"] },
      { name: "Mrs. Sarah van der Merwe", email: "sarah@edunexus.edu", subjects: ["ENG101", "AFR101"] },
      { name: "Ms. Nomsa Khumalo", email: "nomsa@edunexus.edu", subjects: ["LO101", "HIST101"] },
      { name: "Mr. Sipho Ndlovu", email: "sipho@edunexus.edu", subjects: ["GEO101", "ECON101"] },
      { name: "Mrs. Lerato Moloi", email: "lerato@edunexus.edu", subjects: ["TECH101", "NATSCI101"] },
    ];
    const teacherIds: any[] = [];
    for (const t of teachers) {
      const tid = await ctx.db.insert("users", {
        name: t.name,
        email: t.email,
        role: "teacher",
        isActive: true,
        teacherSubject: t.subjects.map((code) => subjectIds[code]),
      });
      teacherIds.push(tid);
    }

    // Update subjects with teachers
    for (const t of teachers) {
      for (const code of t.subjects) {
        await ctx.db.patch(subjectIds[code], { teacher: [teacherIds[teachers.indexOf(t)]] });
      }
    }

    // 4. Classes
    const classData = [
      { name: "Grade 10A", teacherIdx: 0, subjects: ["MATH101", "SCI101", "ENG101", "AFR101", "LO101", "HIST101"], capacity: 35 },
      { name: "Grade 10B", teacherIdx: 1, subjects: ["MATH101", "ENG101", "GEO101", "ECON101", "LO101"], capacity: 30 },
      { name: "Grade 11A", teacherIdx: 2, subjects: ["MATH101", "SCI101", "ENG101", "HIST101", "GEO101"], capacity: 32 },
      { name: "Grade 11B", teacherIdx: 3, subjects: ["ENG101", "AFR101", "ECON101", "TECH101", "NATSCI101"], capacity: 28 },
      { name: "Grade 12A", teacherIdx: 0, subjects: ["MATH101", "SCI101", "ENG101", "HIST101"], capacity: 30 },
    ];
    const classIds: any[] = [];
    for (const c of classData) {
      const cid = await ctx.db.insert("classes", {
        name: c.name,
        academicYear: yearId,
        classTeacher: teacherIds[c.teacherIdx],
        subjects: c.subjects.map((code) => subjectIds[code]),
        students: [],
        capacity: c.capacity,
      });
      classIds.push(cid);
    }

    // 5. Students
    const studentData = [
      { name: "Liam Patel", email: "liam@student.edu", classIdx: 0 },
      { name: "Zanele Dlamini", email: "zanele@student.edu", classIdx: 0 },
      { name: "Jake Williams", email: "jake@student.edu", classIdx: 0 },
      { name: "Amara Okafor", email: "amara@student.edu", classIdx: 1 },
      { name: "Pieter Botha", email: "pieter@student.edu", classIdx: 1 },
      { name: "Thandiwe Mbedzi", email: "thandiwe@student.edu", classIdx: 2 },
      { name: "Kyle Jacobs", email: "kyle@student.edu", classIdx: 2 },
      { name: "Naledi Khumalo", email: "naledi@student.edu", classIdx: 3 },
      { name: "Ryan de Villiers", email: "ryan@student.edu", classIdx: 3 },
      { name: "Sipho Zulu", email: "sipho.z@student.edu", classIdx: 4 },
      { name: "Emma Thompson", email: "emma@student.edu", classIdx: 4 },
      { name: "Bongani Nkosi", email: "bongani@student.edu", classIdx: 4 },
    ];
    const studentIds: any[] = [];
    const classStudents: Record<number, any[]> = {};
    for (const s of studentData) {
      const sid = await ctx.db.insert("users", {
        name: s.name,
        email: s.email,
        role: "student",
        isActive: true,
        studentClass: classIds[s.classIdx],
      });
      studentIds.push(sid);
      if (!classStudents[s.classIdx]) classStudents[s.classIdx] = [];
      classStudents[s.classIdx].push(sid);
    }
    // Link students to classes
    for (const [idx, sids] of Object.entries(classStudents)) {
      await ctx.db.patch(classIds[Number(idx)], { students: sids });
    }

    // 6. Parents
    const parentData = [
      { name: "Mrs. Patel", email: "patel.parent@email.com", linkedStudent: studentIds[0] },
      { name: "Mr. Dlamini", email: "dlamini.parent@email.com", linkedStudent: studentIds[1] },
      { name: "Mrs. Williams", email: "williams.parent@email.com", linkedStudent: studentIds[2] },
      { name: "Mr. Okafor", email: "okafor.parent@email.com", linkedStudent: studentIds[3] },
      { name: "Mrs. Botha", email: "botha.parent@email.com", linkedStudent: studentIds[4] },
    ];
    for (const p of parentData) {
      await ctx.db.insert("users", {
        name: p.name,
        email: p.email,
        role: "parent",
        isActive: true,
        linkedStudent: p.linkedStudent,
      });
    }

    // 7. Admin
    await ctx.db.insert("users", {
      name: "Admin User",
      email: "alexsouthflow@gmail.com",
      role: "admin",
      isActive: true,
    });

    await ctx.db.insert("users", {
      name: "Mukondi Ramadi",
      email: "ramadimukondi13@gmail.com",
      role: "admin",
      isActive: true,
    });

    await ctx.db.insert("users", {
      name: "Admin User 2",
      email: "alexsouthflow2@gmail.com",
      role: "admin",
      isActive: true,
    });

    await ctx.db.insert("users", {
      name: "Admin User 3",
      email: "alxsouthflow2@gmail.com",
      role: "admin",
      isActive: true,
    });

    // 8. Study Materials
    await ctx.db.insert("materials", {
      title: "Grade 10 Algebra Fundamentals",
      description: "Comprehensive notes covering linear equations, quadratic functions, and inequalities for Grade 10 Mathematics.",
      subject: subjectIds["MATH101"],
      teacher: teacherIds[0],
      fileUrl: "https://example.com/math-algebra.pdf",
      fileType: "document",
      extractedText: "Algebra is a branch of mathematics dealing with symbols and the rules for manipulating those symbols. In elementary algebra, those symbols represent quantities without fixed values, known as variables.",
    });
    await ctx.db.insert("materials", {
      title: "Newton's Laws of Motion",
      description: "Detailed explanation of Newton's three laws with worked examples and practice problems.",
      subject: subjectIds["SCI101"],
      teacher: teacherIds[0],
      fileUrl: "https://example.com/physics-newton.pdf",
      fileType: "document",
      extractedText: "Newton's First Law states that an object at rest stays at rest and an object in motion stays in motion with the same speed and direction unless acted upon by an unbalanced force.",
    });
    await ctx.db.insert("materials", {
      title: "Essay Writing Guide",
      description: "Step-by-step guide to writing persuasive, narrative, and descriptive essays for Grade 10-12 English.",
      subject: subjectIds["ENG101"],
      teacher: teacherIds[1],
      fileUrl: "https://example.com/english-essay.pdf",
      fileType: "document",
      extractedText: "A well-structured essay contains an introduction with a thesis statement, body paragraphs with supporting evidence, and a conclusion that reinforces the main argument.",
    });
    await ctx.db.insert("materials", {
      title: "South African History: Apartheid Era",
      description: "Overview of the apartheid period, key figures, and the transition to democracy.",
      subject: subjectIds["HIST101"],
      teacher: teacherIds[2],
      fileUrl: "https://example.com/history-apartheid.pdf",
      fileType: "document",
      extractedText: "Apartheid was a system of institutionalised racial segregation that existed in South Africa from 1948 until the early 1990s.",
    });

    // 9. Announcements
    await ctx.db.insert("announcements", {
      title: "Welcome to the 2026 Academic Year!",
      content: "We are excited to welcome all students, parents, and staff to a new year of learning and growth. Please ensure all profiles are updated and fee accounts are in good standing.",
      author: teacherIds[0],
      targetRoles: ["student", "teacher", "parent"],
      priority: "normal",
    });
    await ctx.db.insert("announcements", {
      title: "Grade 12 Preliminary Exams — 15 March 2026",
      content: "All Grade 12 students are reminded that preliminary examinations begin on 15 March. Timetables have been published on the portal. Please collect your study packs from the admin office.",
      author: teacherIds[2],
      targetRoles: ["student", "teacher"],
      priority: "urgent",
    });
    await ctx.db.insert("announcements", {
      title: "Parent-Teacher Evening — 28 February 2026",
      content: "Parents are invited to the first parent-teacher evening of the year. Book your slot through the parent portal. Light refreshments will be served.",
      author: teacherIds[1],
      targetRoles: ["parent", "teacher"],
      priority: "normal",
    });

    // 10. Assignments
    await ctx.db.insert("assignments", {
      title: "Algebra Practice Set A",
      description: "Complete exercises 1-20 from Chapter 5. Show all working. Due in 2 weeks.",
      subject: subjectIds["MATH101"],
      class: classIds[0],
      teacher: teacherIds[0],
      dueDate: "2026-03-15",
      maxPoints: 50,
    });
    await ctx.db.insert("assignments", {
      title: "Newton's Laws Lab Report",
      description: "Write up the practical investigation on Newton's Second Law. Include hypothesis, method, results, and conclusion.",
      subject: subjectIds["SCI101"],
      class: classIds[0],
      teacher: teacherIds[0],
      dueDate: "2026-03-20",
      maxPoints: 30,
    });
    await ctx.db.insert("assignments", {
      title: "Persuasive Essay: Climate Change",
      description: "Write a 500-word persuasive essay on why South Africa should invest more in renewable energy. Use at least 3 credible sources.",
      subject: subjectIds["ENG101"],
      class: classIds[1],
      teacher: teacherIds[1],
      dueDate: "2026-03-25",
      maxPoints: 40,
    });

    // 11. Events
    await ctx.db.insert("events", {
      title: "School Opening Day",
      description: "First day of the 2026 academic year. Assembly at 8:00 AM in the school hall.",
      date: "2026-01-15",
      type: "other",
      targetRoles: ["student", "teacher", "parent"],
      createdBy: teacherIds[0],
    });
    await ctx.db.insert("events", {
      title: "Inter-House Athletics",
      description: "Annual inter-house athletics competition. All students must participate in at least one event.",
      date: "2026-02-20",
      type: "sports",
      targetRoles: ["student", "teacher"],
      createdBy: teacherIds[2],
    });
    await ctx.db.insert("events", {
      title: "Grade 12 Farewell",
      description: "Farewell ceremony for the Class of 2026. Formal attire required.",
      date: "2026-10-15",
      type: "other",
      targetRoles: ["student", "teacher", "parent"],
      createdBy: teacherIds[0],
    });
    await ctx.db.insert("events", {
      title: "March Examinations Begin",
      description: "First term formal examinations commence. Check your timetable on the portal.",
      date: "2026-03-10",
      endDate: "2026-03-20",
      type: "exam",
      targetRoles: ["student", "teacher"],
      createdBy: teacherIds[0],
    });

    // 12. Badges
    await ctx.db.insert("badges", {
      student: studentIds[0],
      title: "Perfect Attendance",
      description: "No absences in the first month of school.",
      icon: "🏆",
      category: "attendance",
      awardedAt: Date.now(),
    });
    await ctx.db.insert("badges", {
      student: studentIds[1],
      title: "Top of the Class",
      description: "Highest average in Grade 10A for Term 1.",
      icon: "⭐",
      category: "academic",
      awardedAt: Date.now(),
    });
    await ctx.db.insert("badges", {
      student: studentIds[5],
      title: "Sports Star",
      description: "Won 3 gold medals at inter-house athletics.",
      icon: "🏅",
      category: "participation",
      awardedAt: Date.now(),
    });

    // 13. Fees
    await ctx.db.insert("fees", {
      student: studentIds[0],
      amount: 15000,
      dueDate: "2026-01-31",
      status: "paid",
      academicYear: yearId,
      description: "Annual school fees 2026",
    });
    await ctx.db.insert("fees", {
      student: studentIds[1],
      amount: 15000,
      dueDate: "2026-01-31",
      status: "pending",
      academicYear: yearId,
      description: "Annual school fees 2026",
    });
    await ctx.db.insert("fees", {
      student: studentIds[2],
      amount: 15000,
      dueDate: "2026-01-31",
      status: "overdue",
      academicYear: yearId,
      description: "Annual school fees 2026",
    });
    await ctx.db.insert("fees", {
      student: studentIds[3],
      amount: 12000,
      dueDate: "2026-02-28",
      status: "pending",
      academicYear: yearId,
      description: "Annual school fees 2026 — sibling discount applied",
    });

    // 14. School Settings
    await ctx.db.insert("schoolSettings", {
      name: "Edunexus Demo School",
      address: "123 Ubuntu Street, Johannesburg, Gauteng, 2000",
      phone: "+27 11 123 4567",
      email: "info@edunexus.edu",
      motto: "Empowering Every Learner",
      primaryColor: "#3ecf8e",
    });

    return "Seed completed successfully! Created: 1 academic year, 10 subjects, 5 teachers, 12 students, 5 parents, 1 admin, 4 classes, 4 materials, 3 announcements, 3 assignments, 4 events, 3 badges, 4 fee records, 1 school settings.";
  },
});

const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, TableOfContents, PageBreak, AlignmentType, UnderlineType, BorderStyle } = require('docx');

async function createHandbookDocx() {
  const sections = [];

  // Cover Page
  sections.push(
    new Paragraph({
      text: "HR PERFORMANCE MANAGEMENT SYSTEM",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "Complete Feature List & User Handbook",
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Version: 1.0",
          break: 2,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: "Last Updated: January 2026",
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: "System URL: https://sakhr.saksolution.com",
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    })
  );

  // Table of Contents
  sections.push(
    new Paragraph({
      text: "TABLE OF CONTENTS",
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
    }),
    new TableOfContents("Table of Contents", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    })
  );

  // System Overview
  sections.push(
    new Paragraph({
      text: "System Overview",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "The SAK HR Performance Management System is a comprehensive, UAE-compliant platform designed to streamline employee performance evaluations, goal tracking, and appraisal processes. The system supports multi-level review workflows, competency-based assessments, and automated appraisal letter generation.",
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: "Key Benefits",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  const benefits = [
    "Structured Performance Reviews - Systematic evaluation cycles with clear workflows",
    "Multi-Level Approval - Employee self-assessment → Manager review → HR review",
    "Goal Management - Track individual and team objectives with progress monitoring",
    "UAE Compliance - Built-in support for UAE labor law requirements",
    "Automated Documentation - Generate professional appraisal letters and reports",
    "Role-Based Access - Secure access controls for employees, managers, and HR",
    "Real-Time Analytics - Dashboards and metrics for informed decision-making"
  ];

  benefits.forEach(benefit => {
    sections.push(
      new Paragraph({
        text: benefit,
        bullet: { level: 0 },
        spacing: { after: 100 },
      })
    );
  });

  // User Roles & Access Levels
  sections.push(
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: "User Roles & Access Levels",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "1. Employee",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: "What Employees Can Do:",
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 100, after: 100 },
    })
  );

  const employeeCapabilities = [
    "Complete self-assessments during review cycles",
    "Set and track personal goals",
    "View their own performance evaluations",
    "Access their appraisal letters (view and download PDF)",
    "Receive notifications about pending tasks",
    "View performance history and ratings"
  ];

  employeeCapabilities.forEach(cap => {
    sections.push(
      new Paragraph({
        text: cap,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  sections.push(
    new Paragraph({
      text: "2. Manager",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: "What Managers Can Do:",
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 100, after: 100 },
    })
  );

  const managerCapabilities = [
    "Everything an employee can do (for their own profile)",
    "Conduct performance reviews for direct reports",
    "Approve/reject team members' self-assessments",
    "View evaluations for their team members",
    "Create and monitor team goals",
    "Download appraisal letters for team members",
    "Provide feedback and ratings for direct reports",
    "Access manager dashboard with team analytics"
  ];

  managerCapabilities.forEach(cap => {
    sections.push(
      new Paragraph({
        text: cap,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  sections.push(
    new Paragraph({
      text: "3. HR / Admin",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: "What HR Can Do:",
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 100, after: 100 },
    })
  );

  const hrCapabilities = [
    "Full system access and administration",
    "Create and manage review cycles",
    "Define competencies, KPIs, and rating scales",
    "Configure merit/demerit criteria",
    "Generate appraisal letters for all employees",
    "View all evaluations across the organization",
    "Run calibration sessions",
    "Create improvement plans",
    "Access all reports and analytics",
    "Manage master data (departments, roles)",
    "Override evaluations when necessary"
  ];

  hrCapabilities.forEach(cap => {
    sections.push(
      new Paragraph({
        text: cap,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  // Core Features
  sections.push(
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: "Core Features",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "✓ Employee Management",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: "Employee Profiles - Comprehensive employee data including:",
      bold: true,
      spacing: { after: 100 },
    })
  );

  const employeeProfileFeatures = [
    "Personal information (Name, Email, Emirates ID)",
    "Employment details (Code, Department, Role, Manager)",
    "Employment type (Full-time, Part-time, Contract, Probation)",
    "Status tracking (Active, Inactive, Suspended, Terminated)",
    "Hire date and probation period tracking",
    "Location and nationality information"
  ];

  employeeProfileFeatures.forEach(feature => {
    sections.push(
      new Paragraph({
        text: feature,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  sections.push(
    new Paragraph({
      text: "Additional Features:",
      bold: true,
      spacing: { before: 150, after: 100 },
    })
  );

  const additionalFeatures = [
    "Organizational Hierarchy - Visual representation of reporting relationships",
    "Department Management - Organize employees by department",
    "Role Management - Define job roles and assign to employees"
  ];

  additionalFeatures.forEach(feature => {
    sections.push(
      new Paragraph({
        text: feature,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  // Performance Evaluation System
  sections.push(
    new Paragraph({
      text: "✓ Performance Evaluation System",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: "Multi-Stage Evaluation Process:",
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 100, after: 100 },
    })
  );

  const evaluationStages = [
    "Self-Assessment - Employees evaluate their own performance",
    "Manager Review - Direct manager conducts evaluation",
    "HR Review - Final review and calibration by HR",
    "Approval Workflow - Three-level approval (Employee → Manager → HR)"
  ];

  evaluationStages.forEach(stage => {
    sections.push(
      new Paragraph({
        text: stage,
        numbering: { reference: "numbering", level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  sections.push(
    new Paragraph({
      text: "Evaluation Components:",
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 150, after: 100 },
    })
  );

  const evalComponents = [
    "Competency Assessment - Rate employees on 15 predefined competencies with weighted scoring",
    "KPI Evaluation - Track key performance indicators with measurable targets",
    "Merit & Demerit Tracking - Document achievements and issues with weighted impact"
  ];

  evalComponents.forEach(comp => {
    sections.push(
      new Paragraph({
        text: comp,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  // Goal Management
  sections.push(
    new Paragraph({
      text: "✓ Goal Management",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: "SMART Goals - Set Specific, Measurable, Achievable, Relevant, Time-bound goals with the following features:",
      spacing: { after: 100 },
    })
  );

  const goalFeatures = [
    "Goal Categories - Organize by type (Professional, Personal, Team)",
    "Priority Levels - High, Medium, Low priority assignment",
    "Progress Tracking - Monitor completion percentage (0-100%)",
    "Status Management - Draft, Active, Completed goal states",
    "Alignment - Link goals to competencies and organizational objectives",
    "Target dates and measurable metrics",
    "Filter and search by status, category, priority"
  ];

  goalFeatures.forEach(feature => {
    sections.push(
      new Paragraph({
        text: feature,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  // Review Cycle Management
  sections.push(
    new Paragraph({
      text: "✓ Review Cycle Management",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  const cycleFeatures = [
    "Flexible Scheduling - Define start and end dates",
    "Self-Assessment Deadlines - Set cutoff dates for employee submissions",
    "Cycle Status - Active, Closed, Upcoming cycle states",
    "Rating Scale Association - Link specific rating scales to cycles",
    "Create multiple concurrent review cycles (Annual, Mid-Year, Quarterly)",
    "Track cycle progress and completion rates",
    "Automated notifications for upcoming deadlines"
  ];

  cycleFeatures.forEach(feature => {
    sections.push(
      new Paragraph({
        text: feature,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  // Appraisal Letters
  sections.push(
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: "✓ Appraisal Letters",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: "Letter Generation Features:",
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 100, after: 100 },
    })
  );

  const letterFeatures = [
    "Automated Creation - Generate professional appraisal letters from evaluations",
    "UAE-Compliant Format - Meets local labor law requirements",
    "PDF Export - Download letters in A4 format",
    "Customizable content with employee details, ratings, and recommendations",
    "Approval workflow (Pending → Approved → Rejected)",
    "Role-based access control"
  ];

  letterFeatures.forEach(feature => {
    sections.push(
      new Paragraph({
        text: feature,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  // Manager Dashboard
  sections.push(
    new Paragraph({
      text: "✓ Manager Dashboard",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  const dashboardFeatures = [
    "Team performance overview with real-time metrics",
    "Pending evaluations count",
    "Completed vs. outstanding reviews",
    "Team goal completion rates",
    "Average team performance rating",
    "Quick access to team member evaluations",
    "Pending approval notifications"
  ];

  dashboardFeatures.forEach(feature => {
    sections.push(
      new Paragraph({
        text: feature,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  // Additional Core Features
  const additionalCoreFeatures = [
    {
      title: "✓ Calibration & Feedback",
      items: [
        "Cross-Team Calibration - Ensure consistent rating standards",
        "Rating Adjustments - Modify ratings based on calibration discussions",
        "360-Degree Feedback - Collect input from peers and subordinates",
        "Anonymous feedback options",
        "Feedback synthesis and aggregation"
      ]
    },
    {
      title: "✓ Improvement Plans",
      items: [
        "Performance Improvement Plans (PIP) for underperforming employees",
        "Development Plans for career growth",
        "Clear objectives and support plans",
        "Checkpoint scheduling and tracking",
        "Status monitoring (Active, Completed, Cancelled)"
      ]
    },
    {
      title: "✓ Notifications & Alerts",
      items: [
        "Upcoming review deadlines",
        "Pending approvals",
        "Goal due dates approaching",
        "Evaluation status changes",
        "In-app notification center with history"
      ]
    },
    {
      title: "✓ Evidence & Documentation",
      items: [
        "Supporting document attachments",
        "Stage-specific evidence upload",
        "Secure cloud-based storage",
        "Notes and context for each piece of evidence"
      ]
    },
    {
      title: "✓ Security & Compliance",
      items: [
        "Role-based access control (RBAC)",
        "Encrypted password storage (bcrypt)",
        "Secure HTTPS connection (SSL/TLS)",
        "Session management",
        "Audit trail for all actions",
        "Emirates ID tracking",
        "UAE labor law-compliant formats"
      ]
    }
  ];

  additionalCoreFeatures.forEach(section => {
    sections.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    section.items.forEach(item => {
      sections.push(
        new Paragraph({
          text: item,
          bullet: { level: 0 },
          spacing: { after: 80 },
        })
      );
    });
  });

  // Module Guides
  sections.push(
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: "Module-by-Module User Guide",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "Module 1: Employee Self-Assessment",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: "Step-by-Step Process:",
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 100, after: 100 },
    })
  );

  const selfAssessmentSteps = [
    "Access Evaluation - Navigate to Performance → Self Assessment",
    "Complete Assessment Form - Describe accomplishments, challenges, and development needs",
    "Rate Competencies - Provide self-rating with specific examples",
    "Submit Assessment - Review entries and click 'Submit for Manager Review'"
  ];

  selfAssessmentSteps.forEach(step => {
    sections.push(
      new Paragraph({
        text: step,
        numbering: { reference: "numbering", level: 0 },
        spacing: { after: 100 },
      })
    );
  });

  sections.push(
    new Paragraph({
      text: "Module 2: Manager Review",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    }),
    new Paragraph({
      text: "Step-by-Step Process:",
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 100, after: 100 },
    })
  );

  const managerReviewSteps = [
    "Access Manager Dashboard - View pending reviews for team members",
    "Open Employee Evaluation - Review employee's self-assessment",
    "Conduct Review - Provide overall rating, comments, strengths, and areas for improvement",
    "Provide Ratings - Rate each competency and KPI independently",
    "Compensation Recommendations - Suggest salary adjustments or promotions if applicable",
    "Submit Review - Complete all sections and submit to HR"
  ];

  managerReviewSteps.forEach(step => {
    sections.push(
      new Paragraph({
        text: step,
        numbering: { reference: "numbering", level: 0 },
        spacing: { after: 100 },
      })
    );
  });

  sections.push(
    new Paragraph({
      text: "Module 3: Goals Management",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 100 },
    }),
    new Paragraph({
      text: "Creating and tracking goals is simple:",
      spacing: { after: 100 },
    })
  );

  const goalSteps = [
    "Create a Goal - Navigate to Performance → Goals → Create New Goal",
    "Fill in Details - Title, description, category, priority, target date, measurable metric",
    "Set Status - Save as 'Draft' or mark as 'Active'",
    "Track Progress - Update progress percentage regularly",
    "Manage Goals - Filter, search, update, and mark as completed"
  ];

  goalSteps.forEach(step => {
    sections.push(
      new Paragraph({
        text: step,
        numbering: { reference: "numbering", level: 0 },
        spacing: { after: 100 },
      })
    );
  });

  // Workflows
  sections.push(
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: "Key Workflows",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "Workflow 1: Annual Performance Review",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  const workflowSteps = [
    "HR creates Review Cycle (e.g., 'Annual Review 2025')",
    "System sends notifications to all employees",
    "Employee completes Self-Assessment",
    "Manager receives notification and conducts Review",
    "HR receives notification and conducts Final Review",
    "HR generates and approves Appraisal Letter",
    "Employee receives notification and can view/download letter",
    "HR files documentation and updates employee records"
  ];

  workflowSteps.forEach(step => {
    sections.push(
      new Paragraph({
        text: step,
        numbering: { reference: "numbering", level: 0 },
        spacing: { after: 100 },
      })
    );
  });

  // Reports & Analytics
  sections.push(
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: "Reports & Analytics",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "Available Reports:",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  const reports = [
    "Individual Performance Report - Employee history and trends",
    "Team Performance Report - Team composition and averages",
    "Department Analysis - Cross-department comparisons",
    "Review Cycle Report - Completion rates and timelines",
    "Goal Analytics - Goal setting trends and completion rates",
    "Competency Gap Analysis - Training needs identification"
  ];

  reports.forEach(report => {
    sections.push(
      new Paragraph({
        text: report,
        bullet: { level: 0 },
        spacing: { after: 100 },
      })
    );
  });

  // UAE Compliance
  sections.push(
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: "UAE Compliance Features",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "The system is designed specifically for UAE labor law compliance:",
      spacing: { after: 100 },
    })
  );

  const complianceFeatures = [
    "Appraisal letter format meets UAE Ministry of Human Resources requirements",
    "Emirates ID tracking for all employees",
    "Date formats in DD/MM/YYYY (UAE standard)",
    "Work location and nationality tracking",
    "Employment type classification aligned with UAE labor law",
    "Minimum 2-year record retention",
    "Formal documentation of all performance issues"
  ];

  complianceFeatures.forEach(feature => {
    sections.push(
      new Paragraph({
        text: feature,
        bullet: { level: 0 },
        spacing: { after: 100 },
      })
    );
  });

  // System Access
  sections.push(
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: "System Access & Support",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "System URL: ",
          bold: true,
        }),
        new TextRun({
          text: "https://sakhr.saksolution.com",
        }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      text: "Supported Browsers:",
      bold: true,
      spacing: { before: 150, after: 100 },
    })
  );

  const browsers = ["Google Chrome (recommended)", "Microsoft Edge", "Firefox", "Safari"];

  browsers.forEach(browser => {
    sections.push(
      new Paragraph({
        text: browser,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  sections.push(
    new Paragraph({
      text: "Mobile Access:",
      bold: true,
      spacing: { before: 150, after: 100 },
    }),
    new Paragraph({
      text: "The system features responsive web design and is fully accessible from tablets and smartphones through mobile browsers.",
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: "Hours of Operation:",
      bold: true,
      spacing: { before: 150, after: 100 },
    }),
    new Paragraph({
      text: "Sunday - Thursday: 8:00 AM - 5:00 PM GST",
      spacing: { after: 80 },
    }),
    new Paragraph({
      text: "Friday - Saturday: Closed",
      spacing: { after: 200 },
    })
  );

  // Quick Reference
  sections.push(
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: "Quick Reference Guide",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "Status Definitions:",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      text: "Evaluation Status:",
      bold: true,
      spacing: { after: 80 },
    })
  );

  const evaluationStatuses = [
    "DRAFT - Created but not submitted",
    "SELF_REVIEW - Employee self-assessment in progress",
    "MANAGER_REVIEW - Manager review in progress",
    "HR_REVIEW - HR review in progress",
    "FINALIZED - Completed and approved"
  ];

  evaluationStatuses.forEach(status => {
    sections.push(
      new Paragraph({
        text: status,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  sections.push(
    new Paragraph({
      text: "Goal Status:",
      bold: true,
      spacing: { before: 150, after: 80 },
    })
  );

  const goalStatuses = [
    "Draft - Created but not active",
    "Active - Currently being pursued",
    "Completed - Successfully achieved"
  ];

  goalStatuses.forEach(status => {
    sections.push(
      new Paragraph({
        text: status,
        bullet: { level: 0 },
        spacing: { after: 80 },
      })
    );
  });

  // Glossary
  sections.push(
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: "Glossary",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  const glossaryTerms = [
    "Appraisal Letter - Formal written evaluation document issued to employee",
    "Calibration - Process of ensuring consistent rating standards across teams",
    "Competency - Skill, behavior, or knowledge area used for evaluation",
    "KPI (Key Performance Indicator) - Measurable value demonstrating effective achievement",
    "Merit - Positive performance indicator or achievement",
    "Demerit - Negative performance indicator or violation",
    "PIP (Performance Improvement Plan) - Structured plan to address underperformance",
    "Rating Scale - Standardized scale used for performance scoring",
    "Review Cycle - Defined period for conducting performance evaluations",
    "SMART Goals - Specific, Measurable, Achievable, Relevant, Time-bound objectives"
  ];

  glossaryTerms.forEach(term => {
    sections.push(
      new Paragraph({
        text: term,
        bullet: { level: 0 },
        spacing: { after: 100 },
      })
    );
  });

  // Footer
  sections.push(
    new Paragraph({
      text: "",
      pageBreakBefore: true,
    }),
    new Paragraph({
      text: "Contact Information",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      text: "For technical support, training, or questions about the system, please contact your HR administrator.",
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Document Version: ",
          bold: true,
        }),
        new TextRun({
          text: "1.0",
        }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Last Updated: ",
          bold: true,
        }),
        new TextRun({
          text: "January 2026",
        }),
      ],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Prepared by: ",
          bold: true,
        }),
        new TextRun({
          text: "SAK Solutions",
        }),
      ],
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: "End of Handbook",
      alignment: AlignmentType.CENTER,
      italics: true,
    })
  );

  // Create document
  const doc = new Document({
    title: "HR Performance Management System - Handbook",
    description: "Complete Feature List and User Guide",
    creator: "SAK Solutions",
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
    numbering: {
      config: [
        {
          reference: "numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
  });

  // Write to file
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync('HR-Performance-System-Handbook.docx', buffer);
  console.log('✅ DOCX file created successfully: HR-Performance-System-Handbook.docx');
}

createHandbookDocx().catch(console.error);

-- Clear all transactional data while keeping master data
-- Master data: Users, Employees, Departments, Roles, ReviewCycles, Competencies, KPIs, MeritDemerits, RatingScales
-- Transactional data: Everything performance-related (Evaluations, Goals, Appraisals, etc.)

BEGIN;

-- Delete in order of dependencies (children first, parents last)

-- 1. Delete Feedback responses (depends on FeedbackRequest)
DELETE FROM "FeedbackResponse";

-- 2. Delete Feedback requests (depends on Evaluation)
DELETE FROM "FeedbackRequest";

-- 3. Delete Calibration entries (depends on CalibrationSession)
DELETE FROM "CalibrationEntry";

-- 4. Delete Calibration sessions
DELETE FROM "CalibrationSession";

-- 5. Delete Improvement plans
DELETE FROM "ImprovementPlan";

-- 6. Delete Appraisal letters (depends on Evaluation)
DELETE FROM "AppraisalLetter";

-- 7. Delete Manager reviews (depends on Evaluation)
DELETE FROM "ManagerReview";

-- 8. Delete Self assessments (depends on Evaluation)
DELETE FROM "SelfAssessment";

-- 9. Delete Evaluation evidence (depends on Evaluation)
DELETE FROM "EvaluationEvidence";

-- 10. Delete Evaluation activities (depends on Evaluation)
DELETE FROM "EvaluationActivity";

-- 11. Delete Evaluation approvals (depends on Evaluation)
DELETE FROM "EvaluationApproval";

-- 12. Delete Evaluation items (depends on Evaluation)
DELETE FROM "EvaluationItem";

-- 13. Delete Goals
DELETE FROM "Goal";

-- 14. Delete Evaluations
DELETE FROM "Evaluation";

-- 15. Delete Notifications
DELETE FROM "Notification";

-- Display counts of remaining records
SELECT 
  'Users' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Employees', COUNT(*) FROM "Employee"
UNION ALL
SELECT 'Departments', COUNT(*) FROM "Department"
UNION ALL
SELECT 'Roles', COUNT(*) FROM "Role"
UNION ALL
SELECT 'ReviewCycles', COUNT(*) FROM "ReviewCycle"
UNION ALL
SELECT 'Competencies', COUNT(*) FROM "Competency"
UNION ALL
SELECT 'KPIs', COUNT(*) FROM "KPI"
UNION ALL
SELECT 'MeritDemerits', COUNT(*) FROM "MeritDemerit"
UNION ALL
SELECT 'RatingScales', COUNT(*) FROM "RatingScale"
UNION ALL
SELECT 'RatingLevels', COUNT(*) FROM "RatingLevel"
UNION ALL
SELECT '---TRANSACTIONAL DATA---', 0
UNION ALL
SELECT 'Evaluations', COUNT(*) FROM "Evaluation"
UNION ALL
SELECT 'Goals', COUNT(*) FROM "Goal"
UNION ALL
SELECT 'AppraisalLetters', COUNT(*) FROM "AppraisalLetter"
UNION ALL
SELECT 'ManagerReviews', COUNT(*) FROM "ManagerReview"
UNION ALL
SELECT 'SelfAssessments', COUNT(*) FROM "SelfAssessment"
UNION ALL
SELECT 'EvaluationItems', COUNT(*) FROM "EvaluationItem"
UNION ALL
SELECT 'EvaluationApprovals', COUNT(*) FROM "EvaluationApproval"
UNION ALL
SELECT 'EvaluationActivities', COUNT(*) FROM "EvaluationActivity"
UNION ALL
SELECT 'EvaluationEvidence', COUNT(*) FROM "EvaluationEvidence"
UNION ALL
SELECT 'FeedbackRequests', COUNT(*) FROM "FeedbackRequest"
UNION ALL
SELECT 'FeedbackResponses', COUNT(*) FROM "FeedbackResponse"
UNION ALL
SELECT 'CalibrationSessions', COUNT(*) FROM "CalibrationSession"
UNION ALL
SELECT 'CalibrationEntries', COUNT(*) FROM "CalibrationEntry"
UNION ALL
SELECT 'ImprovementPlans', COUNT(*) FROM "ImprovementPlan"
UNION ALL
SELECT 'Notifications', COUNT(*) FROM "Notification";

COMMIT;

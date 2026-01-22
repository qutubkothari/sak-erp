-- Create SelfAssessment table
CREATE TABLE IF NOT EXISTS "SelfAssessment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "evaluationId" TEXT UNIQUE NOT NULL,
  "accomplishments" TEXT NOT NULL,
  "challenges" TEXT NOT NULL,
  "developmentNeeds" TEXT NOT NULL,
  "comments" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "SelfAssessment_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create ManagerReview table
CREATE TABLE IF NOT EXISTS "ManagerReview" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "evaluationId" TEXT UNIQUE NOT NULL,
  "managerId" TEXT,
  "overallRating" DOUBLE PRECISION NOT NULL,
  "managerComments" TEXT NOT NULL,
  "strengths" TEXT NOT NULL,
  "areasForImprovement" TEXT NOT NULL,
  "developmentPlan" TEXT NOT NULL,
  "salaryRecommendation" TEXT NOT NULL,
  "salaryIncreasePercent" DOUBLE PRECISION,
  "recommendedPromotion" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "ManagerReview_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ManagerReview_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Update triggers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_selfassessment_updated_at BEFORE UPDATE ON "SelfAssessment"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_managerreview_updated_at BEFORE UPDATE ON "ManagerReview"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

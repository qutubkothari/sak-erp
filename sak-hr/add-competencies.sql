-- ============================================
-- Add Competencies Only
-- Run this separately if seed was skipped
-- ============================================

-- First check if competencies already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Competency" LIMIT 1) THEN
    INSERT INTO "Competency" (id, name, description, weight, "createdAt") VALUES
      (gen_random_uuid(), 'Communication Skills', 'Ability to convey information clearly and effectively to diverse audiences', 1.0, NOW()),
      (gen_random_uuid(), 'Leadership', 'Ability to guide, motivate, and inspire team members to achieve goals', 1.2, NOW()),
      (gen_random_uuid(), 'Problem Solving', 'Capacity to analyze complex situations and develop effective solutions', 1.1, NOW()),
      (gen_random_uuid(), 'Technical Expertise', 'Proficiency in job-specific technical skills and knowledge', 1.3, NOW()),
      (gen_random_uuid(), 'Teamwork & Collaboration', 'Ability to work effectively with others towards common objectives', 1.0, NOW()),
      (gen_random_uuid(), 'Customer Focus', 'Commitment to understanding and meeting customer needs', 1.0, NOW()),
      (gen_random_uuid(), 'Innovation & Creativity', 'Ability to generate new ideas and approach challenges creatively', 1.1, NOW()),
      (gen_random_uuid(), 'Time Management', 'Skill in prioritizing tasks and managing time effectively', 1.0, NOW()),
      (gen_random_uuid(), 'Adaptability', 'Flexibility to adjust to changing circumstances and new information', 1.0, NOW()),
      (gen_random_uuid(), 'Business Acumen', 'Understanding of business operations and commercial awareness', 1.1, NOW());
    RAISE NOTICE 'Competencies inserted successfully';
  ELSE
    RAISE NOTICE 'Competencies already exist, skipping insert';
  END IF;
END $$;


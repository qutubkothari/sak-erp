-- ============================================
-- Add Competencies Only
-- Run this separately if seed was skipped
-- ============================================

INSERT INTO "Competency" (id, name, description, category, weight, "createdAt") VALUES
  (gen_random_uuid(), 'Communication Skills', 'Ability to convey information clearly and effectively to diverse audiences', 'BEHAVIORAL', 15, NOW()),
  (gen_random_uuid(), 'Leadership', 'Ability to guide, motivate, and inspire team members to achieve goals', 'LEADERSHIP', 20, NOW()),
  (gen_random_uuid(), 'Problem Solving', 'Capacity to analyze complex situations and develop effective solutions', 'BEHAVIORAL', 15, NOW()),
  (gen_random_uuid(), 'Technical Expertise', 'Proficiency in job-specific technical skills and knowledge', 'TECHNICAL', 20, NOW()),
  (gen_random_uuid(), 'Teamwork & Collaboration', 'Ability to work effectively with others towards common objectives', 'BEHAVIORAL', 15, NOW()),
  (gen_random_uuid(), 'Customer Focus', 'Commitment to understanding and meeting customer needs', 'BEHAVIORAL', 10, NOW()),
  (gen_random_uuid(), 'Innovation & Creativity', 'Ability to generate new ideas and approach challenges creatively', 'BEHAVIORAL', 10, NOW()),
  (gen_random_uuid(), 'Time Management', 'Skill in prioritizing tasks and managing time effectively', 'BEHAVIORAL', 10, NOW()),
  (gen_random_uuid(), 'Adaptability', 'Flexibility to adjust to changing circumstances and new information', 'BEHAVIORAL', 10, NOW()),
  (gen_random_uuid(), 'Business Acumen', 'Understanding of business operations and commercial awareness', 'LEADERSHIP', 15, NOW())
ON CONFLICT (name) DO NOTHING;

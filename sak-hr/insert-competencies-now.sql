DELETE FROM "Competency";

INSERT INTO "Competency" (id, name, description, weight, "createdAt") VALUES
  (gen_random_uuid(), 'Communication Skills', 'Ability to convey information clearly and effectively', 1.0, NOW()),
  (gen_random_uuid(), 'Leadership', 'Ability to guide and inspire team members', 1.2, NOW()),
  (gen_random_uuid(), 'Problem Solving', 'Capacity to analyze situations and develop solutions', 1.1, NOW()),
  (gen_random_uuid(), 'Technical Expertise', 'Proficiency in job-specific technical skills', 1.3, NOW()),
  (gen_random_uuid(), 'Teamwork', 'Ability to work effectively with others', 1.0, NOW()),
  (gen_random_uuid(), 'Customer Focus', 'Commitment to meeting customer needs', 1.0, NOW()),
  (gen_random_uuid(), 'Innovation', 'Ability to generate new ideas creatively', 1.1, NOW()),
  (gen_random_uuid(), 'Time Management', 'Skill in prioritizing tasks effectively', 1.0, NOW()),
  (gen_random_uuid(), 'Adaptability', 'Flexibility to adjust to changing circumstances', 1.0, NOW()),
  (gen_random_uuid(), 'Business Acumen', 'Understanding of business operations', 1.1, NOW());

SELECT COUNT(*) as total_competencies FROM "Competency";

DELETE FROM session WHERE user_id = (SELECT id FROM "user" WHERE email = 'test@example.com');
DELETE FROM account WHERE user_id = (SELECT id FROM "user" WHERE email = 'test@example.com');
DELETE FROM known_words WHERE user_id = (SELECT id FROM "user" WHERE email = 'test@example.com');
DELETE FROM "user" WHERE email = 'test@example.com';

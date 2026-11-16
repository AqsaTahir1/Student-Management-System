CREATE DATABASE student_management;

USE student_management;

CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    course_id INT NOT NULL,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO courses (name, description) VALUES
('Computer Science', 'Study of computers and computational systems'),
('Information Technology', 'Study of information systems and technology'),
('Software Engineering', 'Design and development of software systems');

INSERT INTO students (name, email, course_id, status) VALUES
('Ali Ahmed', 'ali@gmail.com', 1, 'Active'),
('Sara Khan', 'sara@gmail.com', 2, 'Active'),
('Usman Malik', 'usman@gmail.com', 3, 'Inactive'),
('Ayesha Noor', 'ayesha@gmail.com', 1, 'Active');

USE student_management;

DELETE FROM admins
WHERE email = 'admin@gmail.com';

SELECT * FROM admins;

SELECT id, name, email, LENGTH(password) AS password_length
FROM admins;
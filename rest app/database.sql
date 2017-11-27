START TRANSACTION;
SET autocommit=0;
DROP TABLE IF EXISTS article_categories;
drop table IF EXISTS read_articles;
drop table IF EXISTS articles;
drop table IF EXISTS sources;
drop table IF EXISTS categories;
drop table IF EXISTS users;

create table sources (id BIGINT PRIMARY KEY AUTO_INCREMENT, source_name TEXT NOT NULL);

create table categories (id BIGINT PRIMARY KEY AUTO_INCREMENT, category_name TEXT NOT NULL);

create table articles (id BIGINT PRIMARY KEY AUTO_INCREMENT, date_published DATE, article_source BIGINT,
title VARCHAR(100), url TEXT, partial_record TINYINT,
FOREIGN KEY (article_source) REFERENCES sources(id));

create table article_categories(id BIGINT PRIMARY KEY AUTO_INCREMENT, article_id BIGINT NOT NULL, category_id BIGINT NOT NULL,
FOREIGN KEY (article_id) REFERENCES articles(id),
FOREIGN KEY (category_id) REFERENCES categories(id));

create table users(id BIGINT PRIMARY KEY AUTO_INCREMENT, email TEXT, google_id TEXT NOT NULL);

create table read_articles(id BIGINT PRIMARY KEY AUTO_INCREMENT, article_id BIGINT NOT NULL, user_id BIGINT NOT NULL, date_read DATE NOT NULL,
scrolled_content_ratio SMALLINT DEFAULT 0, star_rating TINYINT, slant_rating TINYINT,
FOREIGN KEY (article_id) REFERENCES articles(id),
FOREIGN KEY (user_id) REFERENCES users(id));
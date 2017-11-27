from flask import Flask
import flask_sqlalchemy
import flask_restless
import os
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
import logging

Base = declarative_base()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://dmarble:QmBaZUvwppKZYFUGHpfB@/feedback'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = flask_sqlalchemy.SQLAlchemy(app)

"""
Represents the site an article is from.
"""


class ArticleSource(db.Model):
    __tablename__ = 'sources'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column('source_name', db.String)


"""
The category an article falls within.
"""


class ArticleCategory(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column('category_name', db.String)


article_categories = db.Table('article_categories',
                              db.Column('id', db.Integer),
                              db.Column('article_id', db.Integer, db.ForeignKey('articles.id')),
                              db.Column('category_id', db.Integer, db.ForeignKey('categories.id')))

"""
Information about a user reading of a particular article.
"""


class ReadArticle(db.Model):
    __tablename__ = 'read_articles'
    id = db.Column(db.Integer, primary_key=True)
    article_id = db.Column(db.Integer, db.ForeignKey('articles.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    date_read = db.Column(db.Date)
    scrolled_content_ratio = db.Column(db.Integer)
    star_rating = db.Column(db.Integer)
    slant_rating = db.Column(db.Integer)


# class Author(db.Model):
#     __tablename__ = 'authors'
#     id = db.Column(db.Integer, primary_key=True)
#     name = db.Column(db.String)
#
#
# article_authors = db.Table("article_authors", Base.metadata,
#                            Column("author", db.Integer, db.ForeignKey(
#                               Author.id
#                           )),
#                            Column("article", db.Integer, db.ForeignKey(
#                               "articles.id"
#                           )))


class Article(db.Model):
    __tablename__ = 'articles'
    article_id = db.Column('id', db.Integer, primary_key=True)
    author = db.Column(db.String)
    date_published = db.Column(db.Date)
    source = db.Column('article_source', db.String)
    title = db.Column(db.String)
    url = db.Column(db.String, nullable=False)
    partial_record = db.Column(db.Boolean)
    # categories = db.relationship(ArticleCategory, secondary=article_categories)


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column('id', db.Integer, primary_key=True)
    email = db.Column(db.String, nullable=False)
    google_id = db.Column(db.Integer, nullable=False)


api_manager = flask_restless.APIManager(app, flask_sqlalchemy_db=db)
"""
Api for users. We exclude email so we don't expose personal email addresses.
"""
api_manager.create_api(User, methods=['GET', 'POST'], exclude_columns=['email'])
api_manager.create_api(Article, methods=['GET', 'POST', 'PUT'],
                       preprocessors={

                       })
api_manager.create_api(ReadArticle, methods=['POST'])

if (__name__ == '__main__'):
    app.run()

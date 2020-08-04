const mongoose = require('mongoose')
const helper = require('./test_helper')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)
const Blog = require('../models/blog')

beforeEach(async () => {
  await Blog.deleteMany({})
  const blogs = helper.testBlogs.map(blog => new Blog(blog))
  const promiseArray = blogs.map(note => note.save())
  await Promise.all(promiseArray)
})

test('blogs are returned as json', async () => {
  await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test('no of initial blogs are OK', async () => {
  const response = await api.get('/api/blogs')
  expect(response.body).toHaveLength(helper.testBlogs.length)
})

test('title of initial blogs are as expected', async () => {
  const response = await api.get('/api/blogs')
  const titles = response.body.map(b => b.title)
  const expectedTitles = helper.testBlogs.map(b => b.title)
  expectedTitles.forEach((title) => {
    expect(titles).toContainEqual(title)
  })
  // Can also compare the while array
  expect(titles).toEqual(expectedTitles)
})

test('a blog can be added', async () => {
  const newBlog = {
    title: 'Full Stack Open 2020 rocks',
    author: 'Orhan Ugurlu',
    url: 'https://github.com/',
    likes: 1,
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const blogsInDb = await helper.blogsInDb()
  expect(blogsInDb).toHaveLength(helper.testBlogs.length + 1)

  const titles = blogsInDb.map(n => n.title)
  expect(titles).toContain(newBlog.title)

  const blogsInDbWithoutId = await helper.blogsInDbWithoutId()
  expect(blogsInDbWithoutId).toContainEqual(newBlog)
})

test('blog contains expected fields', async () => {
  const response = await api.get('/api/blogs')
  expect(response.body[0].id).toBeDefined()
  expect(response.body[0]._id).not.toBeDefined()
  expect(response.body[0].__v).not.toBeDefined()
})

test('empty like defaults to zero', async () => {
  const newBlog = {
    title: 'Default value in Mongoose',
    author: 'Orhan Ugurlu',
    url: 'https://github.com/',
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const blogsInDb = await helper.blogsInDb()
  expect(blogsInDb).toHaveLength(helper.testBlogs.length + 1)

  expect(blogsInDb.filter(blog => blog.title === newBlog.title)).toHaveLength(1)

  const savedBlog = blogsInDb.find(blog => blog.title === newBlog.title)
  expect(savedBlog.likes).toBe(0)
})

const testMissingProperty = async (newBlogWithMissingField) => {
  await api
    .post('/api/blogs')
    .send(newBlogWithMissingField)
    .expect(400)
    .expect('Content-Type', /application\/json/)

  const blogsInDb = await helper.blogsInDb()
  expect(blogsInDb).toHaveLength(helper.testBlogs.length)
}

test('empty title causes error', async () => {
  const newBlogWithoutTitle = {
    author: 'Orhan Ugurlu',
    url: 'https://github.com/',
  }
  await testMissingProperty(newBlogWithoutTitle)
})

test('empty url causes error', async () => {
  const newBlogWithoutUrl = {
    title: 'Test title',
    author: 'Orhan Ugurlu',
  }
  await testMissingProperty(newBlogWithoutUrl)
})

afterAll(() => {
  mongoose.connection.close()
})

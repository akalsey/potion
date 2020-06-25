# Potion

Potion is a reverse-engineered API for [Notion](https://notion.so). Write your content in Notion, and use Potion's hosted API endpoints to read your content. 

## Guides

I've written a couple of blog posts on my website for using this API. 

* [How to use Notion as your blog's CMS](https://benborgers.com/blog/notion-blog)
* [API to read a Notion table](https://benborgers.com/blog/notion-table)
* [How to turn a Notion doc into a website](https://benborgers.com/blog/notion-to-website)

## Endpoints

All endpoints are relative to the base URL: `https://potion-api.now.sh`

*`<notion-page-id>` refers to the 32 character alphanumeric string in the URL of a Notion doc (but not a query parameter, so not the string after `?v=`).*

### /table

Lists all entries in a full-page Notion table, along with additional details about each page. 

Choose the table with the query parameter `?id=<notion-page-id>`. 

Default output format is JSON. Change this to RSS with the query parameter `format=rss`. For RSS output to work, the table entries must have properties named `URL` and `Name` (the default fields that the Notion Clipper creates).

### /table-description

Generates HTML for the description of a table. 

The only query parameter is `?id=<notion-page-id>`. 

### /html

Generates HTML for a given Notion page. You can insert it as the contents of a blog post, for example. 

The only query parameter is `?id=<notion-page-id>`, which can be obtained from the `/table` endpoint or just by copy-and-pasting from the URL

## Limitations

Most, but not all, of the common Notion blocks are supported at the moment:

- [x] Text
- [x] To-do List
- [x] Heading 1
- [x] Heading 2
- [x] Heading 3
- [x] Bulleted List
- [x] Numbered List
- [ ] Toggle List
- [x] Quote
- [x] Divider
- [ ] Link To Page
- [x] Callout
- [x] Image
- [x] Embed
- [ ] Web Bookmark
- [ ] Video
- [ ] Audio
- [x] Code
- [ ] File
- [x] Math Equation

## Development and Deployment

This project is built to be deployed on [Vercel](https://vercel.com/home). 

For local development, install [Vercel's CLI](https://vercel.com/download) and run `vercel dev`. 

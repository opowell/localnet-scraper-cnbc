import { afterEach, describe, expect, it } from 'vitest'
import { parserLoader, resetPage, visit } from '#scraper-test'

// The parser, evaluated with the helpers it is injected with, as a scrape runs it.
const load = parserLoader(__dirname)

afterEach(resetPage)

describe('listings', () => {
  it.each([
    ['cnbc.js', 'parseCNBC', 'https://www.cnbc.com/', '<a href="/markets/">Markets</a><a href="https://www.cnbc.com/2026/11/05/a.html">A story</a>', 'https://www.cnbc.com/2026/11/05/a.html'],
    ['cnbc.js', 'parseCNBC', 'https://www.cnbc.com/world/?region=world', '<a href="https://www.cnbc.com/2026/11/05/a.html">A story</a>', 'https://www.cnbc.com/2026/11/05/a.html'],
  ])('%s links %s to what it lists, as the default parse finds no links on a page that is no article', async (file, parser, url, body, listed) => {
    visit(url, body)
    expect(await load(file, [parser])[parser]()).toEqual({ listing: true, links: [{ url: listed, score: 1 }] })
  })

  it.each([
    ['cnbc.js', 'parseCNBC', 'https://www.cnbc.com/'],
  ])('%s marks a page it does not read, leaving its content and links to the default parse (%s %s)', async (file, name, url) => {
    const parse = load(file, [name])[name]
    visit(url, '')
    expect(await parse()).toEqual({ listing: true })
  })
})

describe('news sites', () => {
  it('reads a CNBC article as its key points and body, without the quotes and charts among it', () => {
    const { parseCNBC } = load('cnbc.js', ['parseCNBC'])
    visit('https://www.cnbc.com/2026/11/02/oracle-files-to-sell.html', `
      <h1 class="ArticleHeader-headline">Oracle files to sell $20 billion</h1>
      <div class="RenderKeyPoints-wrapper"><div class="RenderKeyPoints-list"><div class="group"><ul><li>Oracle filed plans.</li></ul></div></div></div>
      <div class="ArticleBody-articleBody">
        <div class="RelatedQuotes-relatedQuotes"><p>In this article</p><ul><li>ORCL</li></ul></div>
        <div class="group"><p>Oracle filed plans on Monday.</p></div>
        <div class="InteractiveChart-container"><p>Chart</p></div>
        <div class="group"><p>Shares are down.</p></div>
      </div>`)
    expect(parseCNBC()).toEqual({
      title: 'Oracle files to sell $20 billion',
      content: ['Oracle filed plans.', 'Oracle filed plans on Monday.', 'Shares are down.'],
    })
  })
})

describe('authors', () => {
  const head = (name: string, url: string) => `<post author="${name}" author-url="${url}">`

  it.each([
    ['cnbc.js', 'parseCNBC', 'https://www.cnbc.com/2026/11/02/a.html', 'https://www.cnbc.com/ann/', `
      <h1 class="ArticleHeader-headline">A</h1><a href="https://www.cnbc.com/ann/" class="Author-authorName">Ann<span class="Author-authorUnderline"></span></a>
      <div class="ArticleBody-articleBody"><div class="group"><p>Text.</p></div></div>`],
  ])('heads a post of %s with its author, and links to their page', (file, parser, url, authorUrl, body) => {
    visit(url, body)
    expect(load(file, [parser])[parser]()).toEqual({ title: 'A', content: [head('Ann', authorUrl), 'Text.'], links: [{ url: authorUrl, score: 1 }] })
  })
})

describe('author pages', () => {
  const ranked = (...urls: string[]) => ({ listing: true, links: urls.map((url, rank) => ({ url, score: 1 / (1 + rank / 10) })) })

  it.each([
    ['cnbc.js', 'parseCNBC', 'https://www.cnbc.com/ann/', 'https://www.cnbc.com/2026/11/05/one.html', `
      <div class="RenderBioDetails-bioWrapper">Correspondent</div><a class="RiverCard-title" href="https://www.cnbc.com/2026/11/05/one.html">One</a>`],
  ])('links an author\'s page of %s to each of their works', (file, parser, url, work, body) => {
    visit(url, body)
    expect(load(file, [parser])[parser]()).toEqual(ranked(work))
  })

  it('leaves a CNBC section to the page\'s text', () => {
    const { parseCNBC } = load('cnbc.js', ['parseCNBC'])
    visit('https://www.cnbc.com/technology/', '<a class="RiverCard-title" href="https://www.cnbc.com/2026/11/05/one.html">One</a>')
    expect(parseCNBC()).toBeNull()
  })
})

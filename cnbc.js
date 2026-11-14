// An article (/2026/11/02/oracle-files-to-sell-….html) reads as its headline, a head with its authors, its key points, then each paragraph,
// heading and list item of its body, leaving out the quotes of the stocks it names, its charts and its video players.
// Its pictures load only as they scroll into view, which a scrape's tab never does, so none is read. Other pages
// (sections, quotes) are not parsed, but for an author's (/chloe-taylor/), which links to each of their articles it
// shows, and the home page, which is not read but links to each story it shows. An author's page is told from a section's,
// also a single name, by the author's bio it shows.
function parseCNBC(_profileId) {
  if (!location.hostname.endsWith('cnbc.com')) {
    return null
  }
  if (document.querySelector('.RenderBioDetails-bioWrapper')) {
    return listingOf(linkUrls('a.RiverCard-title'))
  }
  // A browser outside the US is sent on to the home page's international edition, /world/.
  if (/^\/(?:world\/)?$/.test(location.pathname)) {
    // Its stories are in several kinds of block, but all have dated addresses.
    return listingOf(linkUrls('a[href^="https://www.cnbc.com/20"]')) ?? { listing: true }
  }
  const title = document.querySelector('.ArticleHeader-headline')
  const body = document.querySelector('.ArticleBody-articleBody')
  if (!title || !body) {
    return null
  }
  const keyPoints = Array.from(document.querySelectorAll('.RenderKeyPoints-list li'), li => li.innerText.trim())
  const skip = '.RenderKeyPoints-wrapper, .RelatedQuotes-relatedQuotes, .InteractiveChart-container, .InlineVideo-container, [class*="Collapsible"], .HighlightShare-hidden'
  return withAuthors({
    title: title.innerText.trim(),
    content: [...keyPoints, ...textBlocks(body, { lists: true, skip })].filter(Boolean),
  }, linkedAuthors('a.Author-authorName'))
}

// The parser a scrape calls.
registerParser(parseCNBC)

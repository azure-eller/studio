/**
 * The work, as shown on the home page and the Work page. Every item is a live site Christy designed and built;
 * the facts (client, town, address, what the site does) come from the project pages on iamchristyeller.com.
 * The screenshots live in public/photos and are seeded into the `work` media collection, so the owner can add,
 * reorder or remove pieces in the admin; this list adds the address and the caption when the key matches.
 */
export interface WorkItem {
  /** Photo key, as in brief.json and the media table. */
  key: string
  client: string
  town?: string
  /** The client's real web address, shown in the window's title strip. */
  domain: string
  /** One line on what the site does. */
  note: string
}

export const work: WorkItem[] = [
  { key: '/photos/rvr-golf.jpg', client: 'River Valley Ranch Golf Club', town: 'Carbondale', domain: 'rvrgolf.com', note: 'Tee times, rates and an events calendar for a public 18-hole course.' },
  { key: '/photos/bross-hotel.jpg', client: 'Bross Hotel', town: 'Paonia', domain: 'brosshotel.com', note: 'Rooms, breakfast and online booking for a bed and breakfast.' },
  { key: '/photos/paonia-soil.jpg', client: 'Paonia Soil Co.', town: 'Paonia', domain: 'paoniasoilco.com', note: 'A store locator, events and product labels for an organic potting-soil maker.' },
  { key: '/photos/montrose-library.jpg', client: 'Montrose Regional Library District', town: 'Montrose', domain: 'montroselibrary.org', note: 'Meeting-room booking, event calendars and donations.' },
  { key: '/photos/stone-cottage.jpg', client: 'Stone Cottage Cellars', domain: 'stonecottagecellars.com', note: 'Online wine sales, a wine club, events and recipes for a winery.' },
  { key: '/photos/cherry-days.jpg', client: 'Paonia Cherry Days', town: 'Paonia', domain: 'paoniacherrydays.com', note: 'Parade registration and vendor payments for the Fourth of July festival.' },
  { key: '/photos/equitarian.jpg', client: 'Equitarian Initiative', domain: 'equitarianinitiative.org', note: 'Intake forms and fundraising for veterinarians who care for working horses.' },
  { key: '/photos/ela-farms.jpg', client: 'Ela Family Farms', domain: 'elafamilyfarms.com', note: 'A farm store, CSA shares and farm news that goes out by email.' },
  { key: '/photos/fire-mountain.jpg', client: 'Fire Mountain Ranch', town: 'North Fork Valley', domain: 'firemtnranch.com', note: 'A store for grass-fed bison and elk, with a recipe blog.' },
  { key: '/photos/delta-libraries.jpg', client: 'Delta County Libraries', town: 'Delta County', domain: 'deltalibraries.org', note: 'Five branches, events, and tools and seeds to borrow, for the library in her own county.' },
  { key: '/photos/ginger-people.jpg', client: 'The Ginger People', domain: 'gingerpeople.com', note: 'Three stores on one install: United States, Europe and Australia.' },
  { key: '/photos/tererai-trent.jpg', client: 'Tererai Trent International', domain: 'tererai.org', note: 'A store and donations for a foundation that builds schools in Zimbabwe.' },
  { key: '/photos/nfcb.jpg', client: 'National Federation of Community Broadcasters', domain: 'nfcb.org', note: 'Events, a members map and a newsletter for community radio.' },
  { key: '/photos/high-desert-seed.jpg', client: 'High Desert Seed and Gardens', domain: 'highdesertseed.com', note: 'A seed store with product reviews for a farm that ships across the country.' },
  { key: '/photos/third-street.jpg', client: 'Third Street Center', town: 'Carbondale', domain: 'thirdstreetcenter.net', note: 'A video landing page, rentals and tenant resources for a nonprofit hub.' },
  { key: '/photos/rubicon-coffee.jpg', client: 'Rubicon Coffee', town: 'Paonia', domain: 'rubiconcoffeepaonia.com', note: 'Retail and wholesale coffee sales for a small roaster.' },
  { key: '/photos/montrose-foundation.jpg', client: 'Montrose Community Foundation', town: 'Montrose', domain: 'montrosecf.org', note: 'Online donations, grant applications and a volunteer job board.' },
  { key: '/photos/fort-collins-tree.jpg', client: 'Fort Collins Tree Care', town: 'Fort Collins', domain: 'fctreecare.com', note: 'Services and estimate requests for a tree-care company.' },
  { key: '/photos/filana.jpg', client: 'Filana', domain: 'filana.us', note: 'A store for organic beeswax crayons.' },
  { key: '/photos/kvmr.jpg', client: 'KVMR Public Radio', town: 'Nevada City, California', domain: 'kvmr.org', note: 'Live streaming, a program schedule and listener-submitted events.' },
]

export const workByKey = new Map(work.map((w) => [w.key, w]))

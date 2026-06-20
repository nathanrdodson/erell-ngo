#!/usr/bin/env node
// Push page content and create posts in local Ghost instance.
// Run once after setting up the theme: node scripts/migrate-content.js

const crypto = require('crypto');
const http = require('http');

// Set GHOST_ADMIN_KEY=id:secret in your environment, or pass via .env
// Local default: create an Admin API key in Ghost Admin → Integrations
const [KEY_ID, KEY_SECRET] = (process.env.GHOST_ADMIN_KEY || '').split(':');
const HOST = process.env.GHOST_HOST || '127.0.0.1';
const PORT = parseInt(process.env.GHOST_PORT || '2369', 10);
if (!KEY_ID || !KEY_SECRET) { console.error('Set GHOST_ADMIN_KEY=id:secret'); process.exit(1); }

// ── Auth ─────────────────────────────────────────────────────────────────────

function token() {
  const iat = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: KEY_ID })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ iat, exp: iat + 300, aud: '/admin/' })).toString('base64url');
  const sig = crypto.createHmac('sha256', Buffer.from(KEY_SECRET, 'hex')).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const r = http.request({
      hostname: HOST, port: PORT, method, path,
      headers: {
        'Authorization': `Ghost ${token()}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    }, (res) => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => {
        try { resolve({ code: res.statusCode, body: JSON.parse(s) }); }
        catch { resolve({ code: res.statusCode, body: s }); }
      });
    });
    r.on('error', reject);
    r.write(data);
    r.end();
  });
}

async function getPage(slug) {
  return new Promise((resolve, reject) => {
    const r = http.request({
      hostname: HOST, port: PORT, method: 'GET',
      path: `/ghost/api/admin/pages/slug/${slug}/?fields=id,updated_at`,
      headers: { 'Authorization': `Ghost ${token()}` }
    }, (res) => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => {
        const parsed = JSON.parse(s);
        resolve(parsed.pages?.[0] || null);
      });
    });
    r.on('error', reject);
    r.end();
  });
}

async function updatePage(slug, { title, custom_excerpt, html }) {
  const page = await getPage(slug);
  if (!page) { console.log(`  ✗ ${slug}: not found`); return; }
  const body = { pages: [{ title, custom_excerpt, html, updated_at: page.updated_at }] };
  const res = await req('PUT', `/ghost/api/admin/pages/${page.id}/?source=html`, body);
  if (res.code === 200) {
    console.log(`  ✓ ${slug}`);
  } else {
    console.log(`  ✗ ${slug} (${res.code}): ${JSON.stringify(res.body).slice(0, 200)}`);
  }
}

async function createPost({ title, slug, excerpt, html, tags, published_at }) {
  const body = {
    posts: [{
      title, slug, excerpt, html,
      status: 'published',
      published_at,
      tags: tags.map(t => ({ name: t })),
    }]
  };
  const res = await req('POST', '/ghost/api/admin/posts/?source=html', body);
  if (res.code === 201) {
    console.log(`  ✓ post: ${title}`);
  } else {
    console.log(`  ✗ post: ${title} (${res.code}): ${JSON.stringify(res.body).slice(0, 200)}`);
  }
}

// ── Page content ──────────────────────────────────────────────────────────────

const pages = [

  {
    slug: 'about',
    title: 'About',
    custom_excerpt: 'We aim to develop the curiosity and creativity of the next generation of scientists in behavioral ecology — through research experiences that welcome people from all backgrounds into the process of science.',
    html: `
<h2>How We Work</h2>
<p>Every project follows the same three-part process.</p>

<h3>Step 01 — Develop a Question</h3>
<p>Teams arrive in the field and spend time observing before forming a focused, testable research question. No experience required — curiosity is the only prerequisite.</p>

<h3>Step 02 — Collect &amp; Analyze Data</h3>
<p>Participants design methods, gather field data, and analyze results collaboratively. Faculty mentors guide the process without removing ownership from the team.</p>

<h3>Step 03 — Share with the World</h3>
<p>Results are presented at scientific conferences and written up for peer-reviewed publication. Participants also share findings with general audiences and local communities.</p>

<h2>What We Stand For</h2>

<h3>Inclusion</h3>
<p>Scientific discovery belongs to everyone. We actively recruit participants from underrepresented backgrounds and design experiences that are accessible regardless of prior training.</p>

<h3>Authentic Science</h3>
<p>Every participant engages in real research — not simulations. Questions are open, outcomes are unknown, and contributions matter to the broader scientific record.</p>

<h3>Mentorship</h3>
<p>We pair early-career researchers with experienced scientists in a team structure where everyone teaches and everyone learns. The goal is confidence and capability, not just credentials.</p>

<h3>Community</h3>
<p>Our alumni network spans dozens of universities, field sites on four continents, and careers ranging from graduate research to science policy. Once part of Erell, always part of Erell.</p>

<h2>Learn More</h2>
<p>
  <a href="/about/meet-the-team/">Meet the Team</a> &nbsp;&middot;&nbsp;
  <a href="/education/">Our Programs</a> &nbsp;&middot;&nbsp;
  <a href="/research/publications/">Publications</a> &nbsp;&middot;&nbsp;
  <a href="/support/">Support Us</a>
</p>
`
  },

  {
    slug: 'contact',
    title: 'Contact',
    custom_excerpt: "We'd love to hear from you — whether you're interested in our programs, want to collaborate, or have questions about our research.",
    html: `
<h2>General Inquiries</h2>
<p><strong>Email:</strong> <a href="mailto:deifler@erell.ngo">deifler@erell.ngo</a></p>
<p><strong>Discord:</strong> <a href="https://discord.gg/erell" target="_blank" rel="noopener">discord.gg/erell</a></p>

<h2>Italian Wall Lizard Task Force</h2>
<p>For sightings, questions, or involvement with the Italian wall lizard community science project:</p>
<p><strong>Email:</strong> <a href="mailto:info@erell.ngo">info@erell.ngo</a></p>

<h2>Mailing Address</h2>
<p>
  Erell Institute<br>
  2808 Meadow Drive<br>
  Lawrence, KS 66047<br>
  USA
</p>
`
  },

  {
    slug: 'support',
    title: 'Support Erell Institute',
    custom_excerpt: 'Erell Institute is a 501(c)(3) nonprofit organization aiming to build a community of scholars pursuing education through ecological research. Your support makes that possible.',
    html: `
<h2>Make a Donation</h2>
<p>Tax-deductible contributions help spread the passion for curiosity and creativity to the next generation of scientists. Every dollar supports field research experiences, student mentorship, and science education programs.</p>

<h2>Other Ways to Get Involved</h2>
<ul>
  <li>Volunteer your time or expertise for field research or mentorship</li>
  <li>Share our work with your network and community</li>
  <li>Follow us on social media to stay connected</li>
  <li>Contact us about collaboration opportunities</li>
</ul>

<p>For all inquiries about supporting Erell Institute, contact <a href="mailto:deifler@erell.ngo">deifler@erell.ngo</a>.</p>
`
  },

  {
    slug: 'education',
    title: 'Education',
    custom_excerpt: 'We believe the best way to teach people how to be a scientist is to bring them into the field and let them explore and learn how to be curious and ask questions inspired by the nature around them.',
    html: `
<h2>Lizard Camp</h2>
<p>Using hands-on learning in desert ecosystems to teach students how to be a scientist!</p>
<p><a href="/education/lizard-camp/">Learn more about Lizard Camp &rarr;</a></p>

<h2>Naturalist-Ecologist Training Program (NETP)</h2>
<p>Developing curiosity and creativity in young researchers while they determine their next steps in science.</p>
<p><a href="/education/netp/">Learn more about NETP &rarr;</a></p>

<h2>Undergraduate Research Experiences</h2>
<p>Learn more about our past projects and find out about upcoming opportunities!</p>
<p><a href="/education/netp/">Learn more about undergrad research &rarr;</a></p>
`
  },

  {
    slug: 'netp',
    title: 'NETP',
    custom_excerpt: 'Naturalist-Ecologist Training Program',
    html: `
<p>NETP is a post-baccalaureate experience for recently graduated women that focuses on professional development and preparedness to build foundations for internship, job, or graduate school applications. We aim to develop curiosity and creativity while participants develop research skills with a strong field emphasis.</p>

<p>Participants actively engage in the entire research process — from idea inception to publication and the presentation of results.</p>

<h2>Skills Developed</h2>
<p>Through fortnightly meetings, participants build:</p>
<ul>
  <li>Confidence in the scientific community</li>
  <li>Communication skills for collaborations and presenting findings</li>
  <li>Critical reading of scientific literature</li>
  <li>Analytical skills — statistical analysis in R, GIS modeling</li>
  <li>Scientific writing</li>
</ul>

<h2>Program Outcomes (2019–2022, 13 Students)</h2>
<ul>
  <li><strong>85%</strong> continued as professional biologists</li>
  <li><strong>4</strong> students enrolled in PhD programs</li>
  <li><strong>2</strong> students enrolled in MS programs</li>
  <li><strong>3</strong> in non-academic biology positions (state parks, aquariums, museums)</li>
</ul>

<h2>Current Status</h2>
<p>From 2023 onward, one-on-one mentoring continues for participants at various career stages. Formal group activities are resuming as students' career timelines allow.</p>

<p>Interested in NETP? Contact us at <a href="mailto:deifler@erell.ngo">deifler@erell.ngo</a>.</p>
`
  },

  {
    slug: 'research',
    title: 'Research',
    custom_excerpt: 'While we aim to allow our students and participants to drive the specific questions we ask, our general research interests fall under two main themes.',
    html: `
<h2>Social Systems</h2>
<p>How animals leverage group dynamics for survival and reproduction — and whether collaborative structures enable species to thrive in environments where solitary individuals might struggle.</p>
<p><a href="/research/social-systems/">Learn more &rarr;</a></p>

<h2>Movement Ecology</h2>
<p>What factors drive movement strategies, and how these behaviors connect to fundamental survival needs and reproductive success.</p>
<p><a href="/research/movement-ecology/">Learn more &rarr;</a></p>

<h2>Italian Wall Lizards</h2>
<p>Community science research on invasive <em>Podarcis siculus</em> in Douglas County, KS.</p>
<p><a href="/research/italian-wall-lizards/">Learn more &rarr;</a></p>

<h2>Publications</h2>
<p>Peer-reviewed research across behavioral ecology, movement ecology, and herpetology.</p>
<p><a href="/research/publications/">View publications &rarr;</a></p>
`
  },

  {
    slug: 'social-systems',
    title: 'Social Systems',
    custom_excerpt: 'Animals use social systems to increase their odds of surviving and reproducing. We explore how these social systems allow animals to exist in areas where individuals on their own might not be so successful.',
    html: `
<h2>Most Recent Project — Little Scrub Island Ground Lizard</h2>
<p>Examining social behavior and group dynamics in the Little Scrub Island ground lizard (<em>Pholidoscelis corax</em>) on Little Scrub Island, Anguilla. This small, isolated population provides a natural laboratory for studying how social structure develops and functions in a resource-limited environment.</p>

<figure class="kg-card kg-embed-card">
  <iframe title="Little Scrub Island Ground Lizard" src="https://player.vimeo.com/video/718391593?h=973fcc3600" width="640" height="360" frameborder="0" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" allowfullscreen></iframe>
</figure>

<h2>Related Research</h2>

<ul>
  <li>
    Social networks and social foraging of the lava lizard (<em>Microlophus atacamensis</em>)<br>
    <em>Utsumi et al. 2022 &nbsp;&middot;&nbsp; Eifler and Eifler 2014</em><br>
    <a href="/assets/pdf/2022 Utsumi et al--Microlophus social [Revista Chilena].pdf" target="_blank">PDF</a>
  </li>
  <li>
    Collective behavior in the Dominica ground lizard (<em>Pholidoscelis fuscatus</em>)<br>
    <em>Grotbeck et al. 2019</em><br>
    <a href="/assets/pdf/2019 Grotbeck et al--Dominca Grouping [Herp Notes].pdf" target="_blank">PDF</a>
  </li>
  <li>
    Future project examining social behavior in the Baja blue rock lizard (<em>Petrosaurus thalassinus</em>)<br>
    <em>Morales-Mendez et al. 2024</em><br>
    <a href="/assets/pdf/2024 Morales-Mendez et al--Baja blue rock liz [Revista LatinAm Herp].pdf" target="_blank">PDF</a>
  </li>
</ul>
`
  },

  {
    slug: 'movement-ecology',
    title: 'Movement Ecology',
    custom_excerpt: 'Movement patterns characterize every animal and provide a window into that animal\'s decision-making. We study movement to examine the behavior of individuals — how they monitor their environment, interact socially, use habitat, forage, and avoid predators.',
    html: `
<h2>Research Projects</h2>

<h3>Space use in blanched lesser earless lizards (<em>Holbrookia maculata</em>)</h3>
<p><em>Guadalupe Mountains National Park, Texas</em><br>Orton et al. 2024</p>

<h3>Toad-headed agama lizards (<em>Phrynocephalus versicolor</em>) movement patterns</h3>
<p><em>Gobi Desert, Mongolia</em><br>Utsumi et al. 2025 — Collaboration with Bazartseren Boldgiv, National University of Mongolia.</p>

<h3>Niche partitioning among three racerunner species (<em>Acanthodactylus</em>)</h3>
<p><em>Sahara Desert, Tunisia</em><br>Eifler et al. 2023</p>

<h3>Niche partitioning between <em>Gambelia wislizenii</em> and <em>Aspidoscelis tigris</em></h3>
<p><em>Great Basin Desert, Oregon</em><br>McAlpine-Bellis et al. 2023</p>

<h3>Intraspecific differences in movement and habitat use</h3>
<p><em>Great Basin Desert, Oregon &amp; Namib Desert</em><br>Garrison et al. 2017; Eifler et al. 2020</p>

<h3>Checkered whiptails (<em>Aspidoscelis neotesselatus</em>) movement and foraging</h3>
<p><em>Chihuahuan Desert, Colorado</em><br>Kusaka et al. 2021; Utsumi et al. 2020</p>

<h3>Predator avoidance</h3>
<p>Liu et al. 2021; Eifler &amp; Eifler 2014; Jacobson et al. 2016; Eifler et al. 2025; Utsumi et al. 2026</p>

<h3>Habitat use</h3>
<p>Eifler et al. 2017; Eifler &amp; Eifler 2025; Eifler et al. 2025; Utsumi et al. in press</p>
`
  },

  {
    slug: 'italian-wall-lizards',
    title: 'Italian Wall Lizards',
    custom_excerpt: 'During COVID, we organized a community science-oriented research project on the invasive Podarcis siculus, or Italian Wall Lizard, in Douglas County, KS.',
    html: `
<figure class="kg-card kg-image-card">
  <img src="/assets/images/research/italian-wall-lizards/Podarcis sisulus.png" alt="Podarcis siculus, or Italian Wall Lizard" />
  <figcaption>An image of <em>Podarcis siculus</em>, or Italian Wall Lizard. Superb photograph taken by Richard Bartz.</figcaption>
</figure>

<p>We are a group of students, mainly undergraduate women, who are passionate about ecology and curious about the world around us! Our sponsors are Doug and Maria Eifler.</p>

<p>There is a large population in Topeka and Lawrence, but also in New York City, Philadelphia, and Los Angeles! They are especially fascinating because they are so great at adapting to suburban and urban environments!</p>

<p>There are many fables about how Italian lizards arrived here in Lawrence but all we know for sure is that it's important that they are not transported anywhere else.</p>

<h2>Research Focus</h2>
<ul>
  <li>We focused on habitat preferences (Friestad et al. 2023)</li>
  <li>We are planning offshoot projects on behavioral syndromes of successful invaders</li>
  <li>On the relationship between wall lizards and native skinks</li>
</ul>

<p><a href="/assets/pdf/2023 Friestad et al--Wall lizard and Skink [Herpetol Notes].pdf" target="_blank">Read the full paper — Friestad et al. 2023 &rarr;</a></p>

<blockquote><strong>That is why it is so important that you do not touch or transport these lizards anywhere.</strong> Questions? Contact the Italian Wall Lizard Task Force at <a href="mailto:deifler@erell.ngo">deifler@erell.ngo</a>.</blockquote>

<p><em>The project was carried out through KU SEEDS Ecology Club and sponsored by Erell Institute.</em></p>
`
  },

  {
    slug: 'publications',
    title: 'Publications',
    custom_excerpt: 'Research from Erell Institute across behavioral ecology, movement ecology, and herpetology. Asterisks (*) denote student co-authors.',
    html: `
<p>Papers marked <strong>PDF</strong> are freely available. For all others, email <a href="mailto:deifler@erell.ngo">deifler@erell.ngo</a> to request a copy.</p>

<h2>Movement &amp; Space Use</h2>
<ul>
  <li>Eifler DA, Sebati N, Eifler MA (2026) Movement in juvenile bushveld lizards (<em>Heliobolus lugubris</em>). <em>African Journal of Ecology</em> 64:e70158. <a href="mailto:deifler@erell.ngo">Request PDF</a> — <a href="https://doi.org/10.1111/aje.70158" target="_blank" rel="noopener">doi:10.1111/aje.70158</a></li>
  <li>Utsumi K, Pham A*, Erdenetsetseg B, Eifler M, Eifler D (2025) Demographic differences in behavior, movement, and habitat use in the toad-headed agama (<em>Phrynocephalus versicolor</em>) of the Gobi Desert. <em>Diversity</em> 17(9):659. <a href="/assets/pdf/Copy of 2025 Utsumi et al--Mongolia Phrynocephalus [Diversity].pdf" target="_blank">PDF</a> — <a href="https://doi.org/10.3390/d17090659" target="_blank" rel="noopener">doi:10.3390/d17090659</a></li>
  <li>Eifler DA, Nguluka L*, Baipidi K*, Dittmer D*, Underwood A*, Eifler MA (2025) Movement path characteristics for the Kalahari Desert lizard (<em>Pedioplanis namaquensis</em>). <em>African Journal of Ecology</em> 63(6):e70099. <a href="mailto:deifler@erell.ngo">Request PDF</a> — <a href="https://doi.org/10.1111/aje.70099" target="_blank" rel="noopener">doi:10.1111/aje.70099</a></li>
  <li>Orton MM, Eifler MA, Utsumi KL, Laurentino TG, Siddiqui D, Haddock JB, Quock R, Eifler DA (2024) <em>Holbrookia maculata</em> space use in the Salt Basin Dunes of the Guadalupe Mountains National Park. <em>Herpetological Review</em> 55(1):7–10. <a href="mailto:deifler@erell.ngo">Request PDF</a></li>
  <li>Tryban ME, Utsumi KL, Olson CNB, Yang JL, Reynolds H, Eifler MA, Eifler DA (2024) Sex-based variation in behavior for the little striped whiptail (<em>Aspidoscelis inornatus</em>). <em>Southwestern Naturalist</em> 68:112–120. <a href="mailto:deifler@erell.ngo">Request PDF</a></li>
  <li>Utsumi KL, Eifler MA, Muradzikwa TE, Luyanda B, Kanyanga MK, Liu EF, Buchanan CA, Eifler DA (2024) Movement characteristics and habitat use of the short blind dart skink, <em>Typhlacontias brevipes</em>. <em>African Journal of Ecology</em> 62:e13307. <a href="mailto:deifler@erell.ngo">Request PDF</a> — <a href="https://doi.org/10.1111/aje.13307" target="_blank" rel="noopener">doi:10.1111/aje.13307</a></li>
  <li>Eifler DA, Eifler MA, Orton M, Utsumi KL, Jarray M, Zaidi A, Chammem M (2023) Movement and space use in three sympatric lacertid lizards (<em>Acanthodactylus</em>). <em>African Journal of Ecology</em> 62:e13247. <a href="mailto:deifler@erell.ngo">Request PDF</a></li>
  <li>McAlpine-Bellis E, Utsumi K, Diamond K, Klein J, Gilbert-Smith S, Garrison G, Eifler M, Eifler D (2023) Movement patterns and habitat use for the sympatric species <em>Gambelia wislizenii</em> and <em>Aspidoscelis tigris</em>. <em>Ecology and Evolution</em> 13:e10422. <a href="/assets/pdf/2023 McAlpine-Bellis et al.--OR sympatric movement [Ecol Evol].pdf" target="_blank">PDF</a></li>
  <li>Eifler DA, Eifler MA, Liu EF, Luyanda B, Utsumi KL, Muradzikwa TE, Kanyanga MK, Buchanan CA (2020) Slip slidin' away: intraspecific variation in movement behavior for the dune-dwelling lizard <em>Meroles anchietae</em>. <em>Journal of Arid Environments</em> 183:104286. <a href="mailto:deifler@erell.ngo">Request PDF</a></li>
  <li>Eifler DA, Eifler MA (2019) Movement and habitat use by adult and juvenile toad-headed agama lizards (<em>Phrynocephalus versicolor</em>) in the eastern Gobi Desert, Mongolia. <em>Herpetology Notes</em> 12:717–719. <a href="/assets/pdf/2019 Eifler & Eifler--Movement of Phrynocephalus in Gobi.pdf" target="_blank">PDF</a></li>
  <li>Garrison GE, Zecchini Gebin JC, Penner JF, Jacobson FE, Eifler MA, Eifler DA (2017) Intraspecific variation in habitat use and movement in long-nosed leopard lizards, <em>Gambelia wislizenii</em>. <em>Southwestern Naturalist</em> 62:187–192. <a href="/assets/pdf/2017 Garrison et al--Gambelia habitat & movement [SW Nat].pdf" target="_blank">PDF</a></li>
</ul>

<h2>Foraging &amp; Diet</h2>
<ul>
  <li>Eifler DA, Stanley MC, Ward DF, Eifler MA, Orton MM* (2026) The influence of prey distribution on the search strategies for foraging desert grassland whiptails, <em>Aspidoscelis uniparens</em>. <em>Diversity</em> 18(1):15. <a href="/assets/pdf/Copy of 2026 Eifler et al--Cnemi food addition [Diversity].pdf" target="_blank">PDF</a> — <a href="https://doi.org/10.3390/d18010015" target="_blank" rel="noopener">doi:10.3390/d18010015</a></li>
  <li>Dittmer DE, Eifler DA, Bipidi K*, Sebati N, Eifler MA (2025) Foraging behaviours in excavated microhabitats: a study of <em>Agama aculeata</em>. <em>African Journal of Ecology</em> 63:e70082. <a href="mailto:deifler@erell.ngo">Request PDF</a> — <a href="https://doi.org/10.1111/aje.70082" target="_blank" rel="noopener">doi:10.1111/aje.70082</a></li>
  <li>Kusaka C, Utsumi K, Staley C, Pedersen R, Valdivia J, Liu E, Caracalas H, Reynolds H, Eifler MA, Eifler DA (2021) Age-dependent search behavior in the Colorado checkered whiptail (<em>Aspidoscelis neotesselata</em>). <em>Western North American Naturalist</em> 81(4):518–528. <a href="/assets/pdf/2021 Kusaka et al--COCW age-dependent search [WNAN].pdf" target="_blank">PDF</a></li>
  <li>Utsumi K, Kusaka C, Pedersen R, Staley C, Dunlap L, Gilbert-Smith S, Eifler MA, Eifler DA (2020) Habitat-dependent search behavior in the Colorado checkered whiptail lizard (<em>Aspidoscelis neotesselata</em>). <em>Western North American Naturalist</em> 80:11–18. <a href="/assets/pdf/2020 Utsumi et al --COCW search [WNAN].pdf" target="_blank">PDF</a></li>
  <li>Garrison G, Phillips M, Eifler M, Eifler D (2016) Intraspecific variation in opportunistic use of trophic resources by the lizard <em>Ameiva corax</em>. <em>Amphibia-Reptilia</em> 37:331–334. <a href="/assets/pdf/2016 Garrison, Phillips, Eifler & Eifler--A. corax resource use [AMRE].pdf" target="_blank">PDF</a></li>
  <li>Eifler DA, Eifler MA (2014) Social foraging in the lizard <em>Ameiva corax</em>. <em>Behavioral Ecology</em> 25:1347–1352. <a href="/assets/pdf/2014 Eifler & Eifler--Ameiva soc forag [BehavEcol].pdf" target="_blank">PDF</a></li>
  <li>Eifler DA, Baipidi K, Eifler MA, Dittmer D, Nguluka L (2012) Influence of prey encounter and prey identity on area-restricted searching in the lizard <em>Pedioplanis namaquensis</em>. <em>Journal of Ethology</em> 30:197–200. <a href="/assets/pdf/2012 Eifler et al--Pedioplanis [J Ethol].pdf" target="_blank">PDF</a></li>
  <li>Eifler DA, Eifler MA, Brown TK (2012) Habitat selection by foraging Texas horned lizards, <em>Phrynosoma cornutum</em>. <em>Southwestern Naturalist</em> 57:39–43. <a href="/assets/pdf/2012 Eifler, Eifler, Brown--Horned Lizards [SW Nat].pdf" target="_blank">PDF</a></li>
  <li>Eifler MA, Eifler DA (2011) <em>Ameiva corax</em>, Little Scrub Island ground lizard, feeding behavior. <em>Herpetological Review</em> 42:270–271. <a href="/assets/pdf/2011 Eifler & Eifler--Ameiva corax feeding [Herp Rev].pdf" target="_blank">PDF</a></li>
</ul>

<h2>Habitat Use, Activity, &amp; Population Biology</h2>
<ul>
  <li>Utsumi KL, Chakroun IK, Saidi H, Dahmen MH*, Nasri W*, Alouadi Y, Boubaker HB, Kmira G, Orton MM*, Eifler MA, Eifler DA (in press) Habitat use and morphology of Bosc's fringe-toed lizard, <em>Acanthodactylus boskianus</em>, in central Tunisia. <em>Reptiles and Amphibians</em>. <span style="font-style:italic">In press</span></li>
  <li>Eifler DA, Dittmer DE*, Dick L*, Rowe B*, Johnson JJ*, Stanley DR*, Eifler MA (2025) Differences in habitat use, thermal ecology, and behavior of the semiaquatic lizard <em>Anolis aquaticus</em>. <em>Diversity</em> 17(10):673. <a href="/assets/pdf/Copy of 2025 Eifler et al--Anolis aquaticus habitat [Diversity].pdf" target="_blank">PDF</a> — <a href="https://doi.org/10.3390/d17100673" target="_blank" rel="noopener">doi:10.3390/d17100673</a></li>
  <li>Eifler MA, Eifler DA (2025) Ecological factors associated with burrow system occupancy by great desert skinks (<em>Liopholis kintorei</em>). <em>Diversity</em> 17(2):134. <a href="/assets/pdf/Copy of 2025 Eifler&Eifler--tjakura burrows [Diversity].pdf" target="_blank">PDF</a> — <a href="https://doi.org/10.3390/d17020134" target="_blank" rel="noopener">doi:10.3390/d17020134</a></li>
  <li>Buchanan CA, Eifler MA, Kanyanga MK, Utsumi KL, Liu EF, Luyanda B, Muradzikwa TE, Eifler DA (2023) The lizard with kaleidoscope eyes: population characteristics of the Namib web-footed gecko, <em>Pachydactylus rangei</em>. <em>Journal of Arid Environments</em> 214:104985. <a href="mailto:deifler@erell.ngo">Request PDF</a></li>
  <li>Friestad AC, Orton MM, Eifler DA (2023) Microhabitat use for sympatric introduced Italian wall lizard, <em>Podarcis siculus</em>, and native five-lined skink, <em>Plestiodon fasciatus</em>. <em>Herpetology Notes</em> 16:5–8. <a href="/assets/pdf/2023 Friestad et al--Wall lizard and Skink [Herpetol Notes].pdf" target="_blank">PDF</a></li>
  <li>Hedman HD, Chuga SC, Eifler DA, Hanghome GPK, Eifler MA (2021) Microhabitat use of two sympatric geckos, Turner's thick-toed gecko (<em>Chondrodactylus turneri</em>) and the common Namib day gecko (<em>Rhoptropus afer</em>). <em>Journal of Arid Environments</em> 188:104448. <a href="mailto:deifler@erell.ngo">Request PDF</a></li>
  <li>Utsumi K, Staley C, Eifler M, N&uacute;&ntilde;ez H, Eifler D (2021) Color variation and habitat use in <em>Liolaemus silvai</em>. <em>South American Journal of Herpetology</em> 21:80–84. <a href="/assets/pdf/2021 Utsumi et al--Liolaemus color variation [SAJH].pdf" target="_blank">PDF</a></li>
  <li>Eifler MA, Marchand R, Eifler DA, Malela K (2017) Habitat use and activity patterns in the nocturnal gecko, <em>Chondrodactylus turneri</em>. <em>Herpetologica</em> 73:43–47. <a href="/assets/pdf/2017 Eifler et al.--Chondrodactylus [Herpetologica].pdf" target="_blank">PDF</a></li>
</ul>

<h2>Behavior, Sociality, &amp; Networks</h2>
<ul>
  <li>Zimmerman JD, Eifler MA, Stanley DR*, Walker JM, Eifler DA (2025) Social interactions within and between species by little striped whiptails (<em>Aspidoscelis inornatus</em>). <em>Western Wildlife</em> 12:31–33. <a href="mailto:deifler@erell.ngo">Request PDF</a></li>
  <li>Diamond KM, Olson C, Utsumi K, Eifler MA, Eifler DA (2024) Differences between juveniles and adults in habitat use, sprint performance, and morphology in the desert horned lizard, <em>Phrynosoma platyrhinos</em>. <em>Ichthyology and Herpetology</em> 112(3):347–352. <a href="mailto:deifler@erell.ngo">Request PDF</a> — <a href="https://doi.org/10.1643/h2023042" target="_blank" rel="noopener">doi:10.1643/h2023042</a></li>
  <li>Morales-M&eacute;ndez IC, Orton MM, Haddock JB, Siles-Cervantes L, Valenzuela-Molina MY, Eifler MA, Ruiz-Gomez ML, Eifler DA (2024) Behavioral assessment reveals social aggregations in <em>Petrosaurus thalassinus</em>. <em>Revista Latinoamericana de Herpetolog&iacute;a</em> e812:19–32. <a href="/assets/pdf/2024 Morales-Mendez et al--Baja blue rock liz [Revista LatinAm Herp].pdf" target="_blank">PDF</a></li>
  <li>Utsumi K, Staley C, N&uacute;&ntilde;ez H, Eifler MA, Eifler DA (2022) The social system of the lava lizard, <em>Microlophus atacamensis</em>. <em>Revista Chilena de Historia Natural</em> 95:9. <a href="/assets/pdf/2022 Utsumi et al--Microlophus social [Revista Chilena].pdf" target="_blank">PDF</a></li>
  <li>Penner JF, Eifler MA, Eifler DA (2021) Patterns of visual and ultraviolet reflectance in femoral gland secretions of two desert lizards. <em>Ichthyology &amp; Herpetology</em> 109:705–709. <a href="mailto:deifler@erell.ngo">Request PDF</a></li>
  <li>Grotbeck VL, Garrison GE, Eifler MA, Eifler DA (2019) Characteristics of grouping in the Dominican ground lizard, <em>Pholidoscelis fuscatus</em>. <em>Herpetological Notes</em> 12:273–278. <a href="/assets/pdf/2019 Grotbeck et al--Dominca Grouping [Herp Notes].pdf" target="_blank">PDF</a></li>
  <li>Eifler D, Eifler M, Malela K, Childers J (2016) Social networks in the Little Scrub Island ground lizard (<em>Ameiva corax</em>). <em>Journal of Ethology</em> 34:343–348. <a href="/assets/pdf/2016 Eifler et al.--Ameiva social networks [J Etho].pdf" target="_blank">PDF</a></li>
  <li>Childers JL, Eifler DA (2015) Intraspecific behavioural variation in the lacertid lizard <em>Meroles cuneirostris</em>. <em>African Journal of Herpetology</em> 64:54–66. <a href="/assets/pdf/2015 Childers & Eifler--Meroles [Afr J Zool].pdf" target="_blank">PDF</a></li>
</ul>

<h2>Anti-predator Behavior</h2>
<ul>
  <li>Utsumi KL, Siddiqui D, Haddock JB, Orton MM, Laurentino TG, Eifler MA, Eifler DA (2026) Escape tactics used by blanched lesser earless lizards (<em>Holbrookia maculata</em>). <em>Diversity</em> 18(2):80. <a href="/assets/pdf/Copy of 2026 Utsumi et al--Holbrookia escape [Diversity].pdf" target="_blank">PDF</a> — <a href="https://doi.org/10.3390/d18020080" target="_blank" rel="noopener">doi:10.3390/d18020080</a></li>
  <li>Eifler DA, Eifler MA, Godoy WB (2025) Nowhere to run, nowhere to hide: escape behavior of <em>Microlophus atacamensis</em>. <em>South American Journal of Herpetology</em> 37(1):41–46. <a href="mailto:deifler@erell.ngo">Request PDF</a> — <a href="https://doi.org/10.2994/SAJH-D-20-00061.1" target="_blank" rel="noopener">doi:10.2994/SAJH-D-20-00061.1</a></li>
  <li>Chhoumi O, Eifler MA, Orton MM*, Eifler DA, Selmi S (2024) Multiple vs. single predator effects by the spotted fringe-fingered lizard (<em>Acanthodactylus maculatus</em>). <em>Journal of Ethology</em>. <a href="/assets/pdf/Copy of 2024 Chhoumi et al--Acanthodactylus escape [J Ethology].pdf" target="_blank">PDF</a> — <a href="https://doi.org/10.1007/s10164-024-00833-5" target="_blank" rel="noopener">doi:10.1007/s10164-024-00833-5</a></li>
  <li>Eifler DA, Eifler MA, Garrison GE, Grotbeck VL (2022) Escape angles for solitary animals and groups of the lizard <em>Pholidoscelis fuscatus</em>. <em>Ethology Ecology &amp; Evolution</em> 35(2):125–133. <a href="mailto:deifler@erell.ngo">Request PDF</a></li>
  <li>Liu EF, Eifler MA, Buchanan CA, Gilbert-Smith S, Eifler DA (2021) Escape by juvenile little striped whiptail lizards (<em>Aspidoscelis inornata</em>). <em>Herpetology Notes</em> 14:479–483. <a href="/assets/pdf/2021 Liu et al--Aspidoscelis inornatus FID [Herp Notes].pdf" target="_blank">PDF</a></li>
  <li>Evans JS, Eifler DA, Eifler MA (2017) Sand-diving as an escape tactic in the lizard <em>Meroles anchietae</em>. <em>Journal of Arid Environments</em> 140:1–5. <a href="mailto:deifler@erell.ngo">Request PDF</a></li>
  <li>Jacobson F, Garrison G, Penner J, Zecchini Gebin J, Eifler M, Eifler D (2016) Escape behaviour in the leopard lizard (<em>Gambelia wislizenii</em>). <em>Amphibia-Reptilia</em> 37:320–324. <a href="/assets/pdf/2016 Jacobson et al--Gambelia escape [AMRE].pdf" target="_blank">PDF</a></li>
  <li>Eifler DA, Eifler MA (2014) Escape tactics in the lizard <em>Meroles cuneirostris</em>. <em>Amphibia-Reptilia</em> 35:383–389. <a href="/assets/pdf/2014 Eifler & Eifler--Meroles cuneirostris escape [AMRE].pdf" target="_blank">PDF</a></li>
</ul>

<h2>Popular Science</h2>
<ul>
  <li>Dittmer DE, Eifler MA, Eifler DA (2015) Reptiles, rarely seen amphibians and rainfall: the trifecta of optimal herping in the Outback. <em>IRCF Reptiles &amp; Amphibians</em> 22(3):111–125. <a href="/assets/pdf/2015 Dittmer et al--Australia popular [IRCF].pdf" target="_blank">PDF</a></li>
  <li>Hedman HD, Alvarez HM, Hanghome GPK, Eifler MA, Eifler DA (2014) Reptiles of the Gobabeb Research and Training Centre. <em>IRCF Reptiles &amp; Amphibians</em> 21(2):73–79. <a href="/assets/pdf/2014 Hedman et al--Gobabeb Reptiles (IRCF).pdf" target="_blank">PDF</a></li>
  <li>The Lizard Squad (2022) A guide to the Salt Basin Sand Dunes, Guadalupe National Park. Zine produced by Lizard Camp 2022 participants. <a href="/assets/pdf/2022 lizard camp ZINE.pdf" target="_blank">PDF</a></li>
</ul>

<h2>ResearchGate Profiles</h2>
<p>Find a complete and up-to-date list of publications on ResearchGate.</p>
<p>
  <a href="https://www.researchgate.net/profile/Doug-Eifler" target="_blank" rel="noopener">Doug Eifler</a> &nbsp;&middot;&nbsp;
  <a href="https://www.researchgate.net/profile/Maria-Eifler" target="_blank" rel="noopener">Maria Eifler</a>
</p>
`
  },

];

// ── Newsletter posts ──────────────────────────────────────────────────────────

const newsletterPosts = [
  {
    title: 'July 2025 Edition',
    slug: 'newsletter-july-2025',
    published_at: '2025-07-01T00:00:00.000Z',
    tags: ['Newsletter'],
    excerpt: 'The latest edition covers the Mongolia research expedition, the new SEEDS ecology club chapter in eastern Kansas, a movement ecology workshop, and collaborations in Mexico.',
    html: `<p>The latest edition covers the Mongolia research expedition, the new SEEDS ecology club chapter in eastern Kansas, a movement ecology workshop, and collaborations in Mexico.</p><p><a href="/assets/pdf/Erell Newsletter 07.2025.pdf" target="_blank">Read the full newsletter (PDF)</a></p>`
  },
  {
    title: 'Mongolia Research Expedition',
    slug: 'mongolia-research-expedition-2024',
    published_at: '2024-08-01T00:00:00.000Z',
    tags: ['Newsletter', 'Field Research'],
    excerpt: 'Doug, Maria, and two US students collaborated with Bazartseren Boldgiv of the National University of Mongolia in the Gobi Desert studying toad-headed agama lizards.',
    html: `<figure class="kg-card kg-image-card"><img src="/assets/images/newsletter-archive/mongolia-research-expedition.jpg" alt="Mongolia research expedition" /></figure><p>Doug, Maria, and two US students collaborated with Bazartseren Boldgiv of the National University of Mongolia in the Gobi Desert. Over three weeks, the team studied movement patterns in adult male, adult female, and juvenile toad-headed agama lizards (<em>Phrynocephalus versicolor</em>) — comparing behavior across demographics in one of the world's most extreme arid environments.</p><p>The project was published as Utsumi et al. 2025 in <em>Diversity</em>.</p>`
  },
  {
    title: 'New Ecology Club Formed',
    slug: 'new-ecology-club-2024',
    published_at: '2024-10-01T00:00:00.000Z',
    tags: ['Newsletter', 'Program News'],
    excerpt: 'Erell Institute formed a new regional Ecological Society of America SEEDS chapter, recruiting students from eastern Kansas and western Missouri.',
    html: `<figure class="kg-card kg-image-card"><img src="/assets/images/newsletter-archive/erell-seeds.png" alt="Erell SEEDS ecology club" /></figure><p>Erell Institute formed a new regional Ecological Society of America SEEDS chapter, recruiting high school, undergraduate, and graduate students from eastern Kansas and western Missouri. The club provides hands-on outdoor activities and introduces students from underrepresented backgrounds to careers in the ecological sciences.</p>`
  },
  {
    title: 'Movement Ecology Workshop',
    slug: 'movement-ecology-workshop-2024',
    published_at: '2024-05-09T00:00:00.000Z',
    tags: ['Newsletter', 'Education'],
    excerpt: 'Erell facilitated a movement ecology workshop at the Baker University Wetlands Discovery Center focused on collaborative research methods and science communication.',
    html: `<figure class="kg-card kg-image-card"><img src="/assets/images/newsletter-archive/movement-workshop.jpg" alt="Movement ecology workshop" /></figure><p>Erell facilitated a movement ecology workshop at the Baker University Wetlands Discovery Center focused on collaborative research methods and science communication. The workshop brought together students and educators for hands-on field activities.</p>`
  },
  {
    title: 'Mexico Collaboration',
    slug: 'mexico-collaboration-2024',
    published_at: '2024-05-27T00:00:00.000Z',
    tags: ['Newsletter', 'Collaboration'],
    excerpt: 'Doug and Maria visited the Ecology & Behavior Lab in Toluca, Mexico, attending the ribbon-cutting for a newly renovated lab facility.',
    html: `<p>Doug and Maria visited the Ecology &amp; Behavior Lab in Toluca, Mexico, attending the ribbon-cutting for a newly renovated lab facility and the Master's defense of Ingrid Morales Méndez, whose thesis examined the effects of temperature on cognitive performance in <em>Aspidoscelis costatus</em> lizards. The visit included seminars and planning for future collaborative field projects.</p>`
  },
  {
    title: 'Mia Phillips Completes PhD at Dartmouth',
    slug: 'mia-phillips-phd-2024',
    published_at: '2024-06-01T00:00:00.000Z',
    tags: ['Newsletter'],
    excerpt: 'Mia Phillips, a member of the Erell Institute Scientific Advisory Board, successfully defended her doctoral dissertation at Dartmouth College.',
    html: `<p>Mia Phillips, a member of the Erell Institute Scientific Advisory Board, successfully defended her doctoral dissertation at Dartmouth College. Her PhD research focused on vibrational communication in beetles — a remarkable contribution to our understanding of animal signaling.</p>`
  },
  {
    title: 'Lizard Camp — Chihuahuan Canyonlands, SW Texas',
    slug: 'lizard-camp-chihuahuan-2025',
    published_at: '2025-08-01T00:00:00.000Z',
    tags: ['Newsletter', 'Field Research'],
    excerpt: 'Lizard Camp 2025 took place in the Chihuahuan Canyonlands of southwest Texas — a training experience for emerging women in science.',
    html: `<figure class="kg-card kg-image-card"><img src="/assets/images/newsletter-archive/lizard-camp-chihuahuan-2025.png" alt="Lizard Camp 2025 — Chihuahuan Canyonlands" /></figure><p>Lizard Camp 2025 took place in the Chihuahuan Canyonlands of southwest Texas — a training experience for emerging women in science that combines field research with professional mentorship.</p>`
  },
  {
    title: 'Lizard Camp — Tunisia',
    slug: 'lizard-camp-tunisia-2023',
    published_at: '2023-09-01T00:00:00.000Z',
    tags: ['Newsletter', 'Field Research'],
    excerpt: 'Read the full report from Lizard Camp in Tunisia.',
    html: `<figure class="kg-card kg-image-card"><img src="/assets/images/newsletter-archive/lizard-camp-tunisia-2023.jpg" alt="Lizard Camp 2023 — Tunisia" /></figure><p>Read the full report from Lizard Camp in Tunisia.</p><p><a href="https://zenodo.org/records/10144602" target="_blank" rel="noopener">Read the Zine on Zenodo &rarr;</a></p>`
  },
  {
    title: 'Wall Lizard Task Force Publication',
    slug: 'wall-lizard-publication-2023',
    published_at: '2023-03-01T00:00:00.000Z',
    tags: ['Newsletter', 'Publication'],
    excerpt: 'New research from the Wall Lizard Task Force explores competition between invasive Italian Wall Lizards and native Five-lined Skinks in the Lawrence, Kansas area.',
    html: `<p>New research from the Wall Lizard Task Force explores competition between invasive Italian Wall Lizards and native Five-lined Skinks in the Lawrence, Kansas area. The study investigates how an introduced species establishes itself within an existing ecological community.</p>`
  },
  {
    title: 'Erell Gives Talk in Tunisia',
    slug: 'erell-talk-tunisia-2023',
    published_at: '2023-01-15T00:00:00.000Z',
    tags: ['Newsletter', 'Seminar'],
    excerpt: 'Doug, Maria, and Makenna presented at a seminar organized in partnership with Harvard\'s Center for Middle Eastern Studies.',
    html: `<figure class="kg-card kg-image-card"><img src="/assets/images/newsletter-archive/pres-2023-01-tunisia.jpg" alt="Erell talk in Tunisia" /></figure><p>Doug, Maria, and Makenna presented at a seminar organized in partnership with Harvard's Center for Middle Eastern Studies, sharing Erell Institute's research on lizard ecology and conservation in North African desert ecosystems.</p>`
  },
  {
    title: 'SEEDS National Field Trip — Konza Prairie',
    slug: 'seeds-konza-2023',
    published_at: '2023-10-01T00:00:00.000Z',
    tags: ['Newsletter', 'SEEDS'],
    excerpt: 'Erell Institute members served as mentors during a SEEDS national field trip to Konza Prairie, Kansas.',
    html: `<p>Erell Institute members served as mentors during a SEEDS national field trip to Konza Prairie, Kansas. Students from California, Hawaii, Minnesota, Puerto Rico, and the Virgin Islands participated in field ecology activities and research projects, with Erell members guiding mentorship and inquiry.</p>`
  },
  {
    title: "Kaera's Master's Thesis Published",
    slug: 'kaera-thesis-2022',
    published_at: '2022-06-01T00:00:00.000Z',
    tags: ['Newsletter', 'Publication'],
    excerpt: "Kaera Utsumi's master's thesis research on social networks in lizard populations was published during 2022.",
    html: `<p>Kaera Utsumi's master's thesis research on social networks in lizard populations was published during 2022.</p>`
  },
  {
    title: 'SEEDS Meetup — Colorado',
    slug: 'seeds-meetup-colorado-2022',
    published_at: '2022-07-01T00:00:00.000Z',
    tags: ['Newsletter', 'SEEDS'],
    excerpt: 'A camping weekend with the Colorado SEEDS chapter took members to Comanche National Grassland, Great Sand Dunes, and TCN Zapata Ranch.',
    html: `<p>A camping weekend with the Colorado SEEDS chapter took members to Comanche National Grassland, Great Sand Dunes, and TCN Zapata Ranch. The trip was supported by ESA funding and organized by Makenna Orton.</p>`
  },
];

// ── News posts ────────────────────────────────────────────────────────────────

const newsPosts = [
  {
    title: 'Baja California Sur, Mexico',
    slug: 'news-baja-california-2026',
    published_at: '2026-03-01T00:00:00.000Z',
    tags: ['News', 'Field Research'],
    excerpt: 'A two-week collaborative expedition pairing US students with Mexican student and faculty teams to study lizard behavioral ecology in Baja Sur.',
    html: `<p>A two-week collaborative expedition pairing US students with Mexican student and faculty teams to study lizard behavioral ecology in Baja Sur.</p>`
  },
  {
    title: 'Chaco, Paraguay',
    slug: 'news-chaco-paraguay',
    published_at: '2026-01-01T00:00:00.000Z',
    tags: ['News', 'Field Research'],
    excerpt: 'Following successful 2025 pilot trips, local collaborators are developing methods to study red tegu movement ecology in the Chaco region.',
    html: `<p>Following successful 2025 pilot trips, local collaborators are developing methods to study red tegu movement ecology in the Chaco region.</p>`
  },
  {
    title: 'Penn State Ecology Seminar',
    slug: 'news-penn-state-seminar-2025',
    published_at: '2025-11-01T00:00:00.000Z',
    tags: ['News', 'Presentation'],
    excerpt: 'Doug and Maria Eifler presented to the Huck Institutes of Life Sciences at Pennsylvania State University\'s Ecology Seminar Series.',
    html: `<p>Doug and Maria Eifler presented to the Huck Institutes of Life Sciences at Pennsylvania State University's Ecology Seminar Series.</p>`
  },
];

// ── Newsletter archive page ──────────────────────────────────────────────────

const newsletterArchivePage = {
  slug: 'newsletter-archive',
  title: 'Archive',
  custom_excerpt: 'Field updates, research results, program news, and events from Erell Institute.',
  html: `
<h2>Recent Presentations</h2>

<h3>Healthy Ways and Dangerous Liaisons: Reptiles, Movement and Connectivity</h3>
<p>Doug Eifler &middot; Colgate University &middot; October 25, 2024</p>

<h3>Risky business: Decisions in the fear landscape</h3>
<p>Doug Eifler &middot; Baker University &middot; April 10, 2024</p>

<h3>I like to move it, move it &amp; Movement ecology: lizards and the path to enlightenment</h3>
<p>Doug &amp; Maria Eifler &middot; UAEM Toluca, Mexico &middot; May 21–27, 2024</p>

<h3>Movement Ecology</h3>
<p>Maria Eifler &middot; Baker Wetlands Discovery Center &middot; May 9, 2024</p>

<h3>Reptiles and Amphibians of Kansas</h3>
<p>Maria Eifler &middot; Baker Wetlands Discovery Center &middot; April 25, 2024</p>

<h3>Lizard Ecology and Conservation in North African Desert Ecosystems</h3>
<p>Doug, Maria &amp; Makenna &middot; Tunisia / Harvard CMES &middot; January 2023</p>

<h3>Movement ecology: lizards and the path to enlightenment</h3>
<p>Doug Eifler &middot; Rhodes College, Memphis &middot; October 9, 2023</p>

<h3>Lizard Tales: Creative Challenges to Life's Solutions</h3>
<p>Doug Eifler &middot; Baker Wetlands Discovery Center &middot; December 2, 2023</p>
`
};

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\nUpdating pages...');
  for (const p of pages) {
    await updatePage(p.slug, { title: p.title, custom_excerpt: p.custom_excerpt, html: p.html });
  }

  console.log('\nUpdating newsletter-archive page...');
  await updatePage(newsletterArchivePage.slug, {
    title: newsletterArchivePage.title,
    custom_excerpt: newsletterArchivePage.custom_excerpt,
    html: newsletterArchivePage.html,
  });

  console.log('\nCreating newsletter posts...');
  for (const p of newsletterPosts) {
    await createPost(p);
  }

  console.log('\nCreating news posts...');
  for (const p of newsPosts) {
    await createPost(p);
  }

  console.log('\nDone.');
})().catch(console.error);

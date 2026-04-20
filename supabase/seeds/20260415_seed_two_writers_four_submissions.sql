-- Seed data: two writers, two submissions each, modern schema.
-- Safe to rerun: removes previous [SEED] rows for these writers in this seed workshop.

begin;

-- Require at least two writer profiles.
do $$
declare
  writer_count integer;
begin
  select count(*) into writer_count
  from public.profiles
  where role::text = 'writer';

  if writer_count < 2 then
    raise exception 'Need at least 2 writer profiles. Found %.', writer_count;
  end if;
end;
$$;

with selected_writers as (
  select id,
         row_number() over (order by created_at asc, id asc) as writer_n
  from public.profiles
  where role::text = 'writer'
  order by created_at asc, id asc
  limit 2
),
seed_workshop_insert as (
  insert into public.workshops (title, slug, created_by)
  select
    'Seed Showcase Workshop',
    'seed-showcase-workshop',
    (
      select id
      from public.profiles
      where role::text in ('teacher', 'admin')
      order by created_at asc, id asc
      limit 1
    )
  where not exists (
    select 1
    from public.workshops
    where slug = 'seed-showcase-workshop'
  )
  returning id
),
seed_workshop as (
  select id from seed_workshop_insert
  union all
  select id from public.workshops where slug = 'seed-showcase-workshop'
  limit 1
),
seed_memberships as (
  insert into public.workshop_members (workshop_id, profile_id)
  select sws.id, sw.id
  from seed_workshop sws
  cross join selected_writers sw
  on conflict do nothing
  returning workshop_id
)
delete from public.submissions s
using selected_writers sw, seed_workshop sws
where s.author_id = sw.id
  and s.workshop_id = sws.id
  and s.title like '[SEED] %';

with selected_writers as (
  select id,
         row_number() over (order by created_at asc, id asc) as writer_n
  from public.profiles
  where role::text = 'writer'
  order by created_at asc, id asc
  limit 2
),
seed_workshop as (
  select id
  from public.workshops
  where slug = 'seed-showcase-workshop'
  limit 1
)
insert into public.submissions (
  author_id,
  workshop_id,
  title,
  body,
  version,
  status
)
select
  sw.id,
  wk.id,
  stories.title,
  stories.body,
  1,
  'submitted'::public.submission_status
from selected_writers sw
join seed_workshop wk on true
join (
  values
    (
      1,
      '[SEED] Mystery - The Last Lantern on Grimsby Pier',
      'At ten past midnight, Mara found the lantern still burning at the end of Grimsby Pier, though the keeper had been dead for three winters and everyone in town swore the oil line had been shut for good. The wind came off the black water in hard, wet gusts, flinging salt into her eyes while the yellow light swung in a slow arc and painted the planks like old bone. She had not meant to come this far. She had meant to walk to the rail, count to ten, and go home to her one-room flat above the bakery. Then she heard the bell.

It rang once from beneath her feet, a small iron sound, neat as a spoon against china. Mara knelt and set her palm to the boards. Another ring, lower now, from the service duct that ran under the pier. She knew the map of those ducts better than any harbor engineer alive. Her father had wired them when she was thirteen, before he vanished one November and left behind two coats and a drawer full of unpaid tabs.

She pried up the inspection hatch with her house key and shone her phone inside. The ladder rungs were wet, and a line of chalk arrows pointed toward the sea wall. Fresh chalk. Not the old utility marks. At the third rung she smelled tobacco and oranges, the same scent that had clung to her father''s cuffs every payday. At the bottom she found a clockwork timer nailed to a beam, ticking beside a brass bell and a knot of blue cable tied in a bow. Someone wanted her to hear this.

The arrows led to a maintenance alcove where rusted tools hung in careful order, cleaned recently, handles oiled. On the back wall, beneath a flake of peeling paint, she found initials carved in the timber: R.H. Her father''s hand had a long right stroke on every H, like a fisherman''s hook. Beside the initials sat a biscuit tin sealed with electrician''s tape. Inside was a ledger wrapped in wax paper, a postcard of Lisbon, and a key stamped 7B.

Mara took the ledger first. Names filled each page in her father''s cramped print, paired with dates, crate numbers, and amounts too neat to be gambling debts. At the back, one line had been written in fresh ink: IF LIGHT RETURNS, TRUST NO ONE IN BLUE. She stared at it while the bell chimed again, this time from above, and footsteps thudded on the boards overhead in pairs. Harbor police wore navy rain capes in winter.

She killed her phone light and listened. Two voices, one male, one female. The man said, She comes here most nights. The woman answered, Then we wait until she reads it. Mara slipped the key and postcard into her coat and left the ledger open to the last page. If they wanted her to read, they wanted to know what she would do next.

She crawled through a drainage crawlspace no wider than a coffin and emerged behind stacked crab pots at the pier head. The lantern still swung above, patient and bright. She watched the officers descend the hatch and heard the man curse when he found only the ledger and no girl. Mara crossed the road, bought a cheap train ticket in cash, and sat under the station clock until dawn with the brass key warm in her fist.

When the first train hissed in, she turned the key over and read the tiny engraving she had missed in the dark: LOCKER HALL, PLATFORM SOUTH, BOX 7B. She smiled without humor. Grimsby had always said ghosts were restless things. It turned out ghosts could keep appointments.'
    ),
    (
      1,
      '[SEED] Science Fiction - A Low Orbit for Broken Things',
      'By the time Station Kestrel dropped into eclipse, Nia had welded three cracked water manifolds, patched a cargo drone with insulation foam, and talked a grieving botanist out of spacing his dead basil seedlings. The station was a wheel of old promises circling Mars, and every promise had started leaking. Nia liked leaks. Leaks told the truth.

At 02:14 ship time, the salvage alarm chirped from Bay Four. She floated down the spoke in sock feet, one hand on guide rails polished by generations of mechanics. In the bay hung a lifeboat no beacon had announced, an antique capsule with scorch marks along its heat shield and a hatch crusted in red dust. Its serial plate read HELIOS COLONY AUX-9, a line decommissioned fifty years ago.

Captain Rourke arrived with security and a face that looked assembled from old weather. We quarantine it, he said. We scan first, Nia answered. He frowned, which meant yes.

The capsule held no passengers. It held crates, each stamped with customs seals so old the logos belonged to countries that no longer existed. In the center sat a single cryochest, power cell dead, glass fogged from the inside. Nia wiped a circle clear with her sleeve. A girl maybe twelve lay curled in thermal mesh, hair drifting like black ink. On the chest lid someone had etched, in careful capitals: IF FOUND, PLEASE DELIVER TO ANY PLACE THAT STILL TEACHES MUSIC.

Protocol said wake medical. Protocol also said report to Authority Registry, then wait twelve to sixteen months for jurisdiction. Nia had grown up in that wait, in corridors where children learned to swallow disappointment before they learned fractions. She checked the chest log. Date of seal: 21 August 2141. Destination field: blank.

The station council split by morning. Half wanted payout rights on historical cargo; half wanted no part of a legal relic. Rourke kept asking the same question: Who launched this and why now? Nia asked a better one: Why music?

She pried open one crate and found instrument parts wrapped in greaseproof cloth. Violin necks. Carbon bows. A brass mouthpiece stamped with a school crest. Another crate held paper scores, real cellulose sheets, edges browned but legible. Debussy. Coltrane transcriptions. A handwritten primer titled Breathing Before Tone. At the bottom, a small recorder chip blinked green when she touched it. A woman''s voice emerged, thin with age.

If you are hearing this, we failed to land. The Authority requisitioned arts cargo for reactor shielding. We stole back what we could and sent Mira with the archive. She can read notation and tune by ear. If there is no colony left, take her somewhere people still listen.

Nia played it twice, then took it to Rourke. He rubbed his eyes and said the thing captains say when they cannot afford conscience: We are not a school.

No, Nia said. We are an orbit full of children raised by maintenance schedules.

She called every station on the relay, starting with the mining hubs that still ran community hours. Most said no. One laughed. Two never answered. At last a small habitat in Valles Marineris replied with a choral warm-up in the background and a principal who said, We have one broken piano and forty-two students. Send her.

They jury-rigged a transfer shuttle from spare guidance boards. Nia sat beside the cryochest through descent, counting each shudder as atmosphere took hold. When Mira woke, she looked at Nia with unfocused brown eyes and whispered, Did it survive?

The music did, Nia said.

At the school dome, children waited in patched uniforms, holding printed staves like welcome signs. Mira touched the glass, then Nia''s wrist. You came back for me, she said, as if testing a myth.

Nia thought of leaking manifolds and cracked promises and things rescued one seal at a time. We are in low orbit, she said. Coming back is what we do.'
    ),
    (
      2,
      '[SEED] Magical Realism - The Rain That Remembered Names',
      'On the first day the remembering rain fell, Alma was shelving peaches in aisle three when every customer in her corner shop spoke their mother''s name out loud at exactly the same time. The sound rolled through the room like a choir forgetting itself: Elena, Noor, Beatriz, Sahana, June. A jar of olives slipped from a man''s hand and shattered, and no one swore. They just listened to the rain tapping the tin awning in a pattern too patient to be weather.

By noon, the town had a theory. By evening, it had six. The priest called it a mercy. The mayor called it a civic disturbance. Alma called it inconvenient, because each time she stepped outside she tasted memory at the back of her tongue and lost her place in the ledger.

The rain smelled of basil and iron. It did not soak clothes, though umbrellas bloomed anyway out of habit. It struck skin and left behind little flashes: a grandmother''s green radio; the exact weight of a baby brother asleep on a shoulder; a red bicycle with no brakes. Children laughed and chased one another through puddles that reflected not faces but kitchens.

Alma had lived in San Jacinto twenty-three years and had trained herself to be practical. Stock the shelves. Pay the invoices. Ignore miracles unless they bought bread. But on the third day, while carrying flour sacks to the storeroom, she heard her own name spoken from outside, not by a customer, not by a friend. It came from the rain itself, clear as a spoon against glass.

Al-ma.

She set the sacks down and stepped into the alley. The rain hit her forehead, and she saw her father on the morning he left, standing by the bus depot with a cardboard suitcase and a shirt too thin for November. In the memory she had always kept, he walked away without turning. In the rain''s version, he turned twice, mouth opening as if to call her, then closed it when he saw who was waiting behind him: a woman in a pale coat holding train tickets and fear.

Alma staggered back under the awning. She had spent years arranging him into one simple shape, the shape of abandonment. The rain had handed her another shape, messier and not kind, but human.

On day five, people began leaving notes in the plaza fountain. To my brother, I kept the toolbox. To Lidia, I was jealous and I am sorry. To whoever borrowed my ladder in 1998, please return it. The postmaster read them aloud at dusk while neighbors passed around sweet bread and pretended not to cry.

Alma wrote nothing. She opened the shop at six, closed at nine, and measured flour by muscle memory while outside the world softened around old sharp edges. Then a boy she did not know came in and bought one orange soda and one postcard of the harbor. Can I leave this with you? he asked, sliding a folded paper across the counter. It has your name.

After he left, she unfolded it. The handwriting leaned hard right, the way her father''s had when he was tired.

Alma,
If the rain reaches you, it means someone finally listened. I did not leave because you were not enough. I left because I was a coward with debts and a bad heart and the wrong idea of sacrifice. There is a savings tin buried under the lemon tree behind your aunt''s old house. It was never much, but it is yours. So was my love, even when I wore it badly.

The rain stopped on the seventh day. The sky cleared as if nothing unusual had happened. Town meetings resumed their normal arguments. Prices rose. Buses ran late. But people greeted one another more carefully, as if each face carried subtitles.

That Sunday, Alma took a spade to the aunt''s yard and dug under the lemon tree until metal rang against dirt. Inside the tin were bills gone soft with damp, two guitar picks, and a photograph of her at six with mango juice on her chin, laughing at someone just outside the frame.

She put the photo by the register. When customers asked who it was, she said, Me, and a man who once got things wrong. Then she handed them their change with both hands, pronouncing each name like weather worth listening to.'
    ),
    (
      2,
      '[SEED] Historical Fiction - Ash and Indigo at Number Nine',
      'London, 1851. The fog that morning sat low over Bermondsey like wet wool, and Elsie Finch could taste coal in every breath by the time she reached Number Nine Dyer''s Court. The workshop windows were already sweating blue. Indigo day. Her least favorite and her best paid.

Inside, vats steamed along the brick wall, each one a patient mouth waiting to swallow cloth. Mr. Harrow, the master dyer, stood with his cane and his ledger, tapping a rhythm that meant hurry. Exhibition orders, girls, he barked. Crystal Palace won''t wait for your dreams.

Elsie tied a scarf over her hair, rolled her sleeves, and plunged lengths of silk into the first vat. Indigo bit slowly, first green as river weed, then blue as bruised evening. She loved that part, the becoming. She hated the rest: the sting in her knuckles, the cough that took half the room by noon, the way pennies disappeared into rent before they warmed her pocket.

At dinner break she sat on an upturned crate with Mina and Ruth behind the drying racks. Mina had smuggled in an orange, a miracle from the docks, and divided it into thin moons. Ruth read aloud from a newspaper clipping about the Great Exhibition''s machine hall, where engines turned themselves and telegraph wires sang messages across rooms. Elsie listened with half an ear. Machines did not interest her unless they could cook supper.

That afternoon, a gentleman in a navy coat arrived with a crate stamped HARRINGTON & SONS, MAYFAIR. He unfolded a sample gown from tissue paper, all ivory silk and tiny covered buttons, and asked for an exact shade match to a ribbon no wider than a finger. Harrow bowed like a hinge and promised perfection. When the gentleman left, Harrow handed Elsie the ribbon.

You''ve the best eye, Finch. Match it by dawn.

She held the ribbon to the light. It was not ordinary blue. It held a breath of violet, a dusk note at the edge. She stayed after the others, feeding coals, adjusting lye, lifting and lowering test strips with tongs until midnight bells rang from St. Olave''s. Her hands shook. Twice she failed. The third mix bloomed true.

At two in the morning she heard the back door scrape. Thinking thief, she snatched the poker and turned. A boy stood there, no older than ten, hat crushed in both hands.

Beg pardon, miss. I''m to fetch the parcel for Lady Harrington. They changed the carriage hour.

No receipt, no parcel, Elsie said automatically.

He held out a note, ink blotted by rain. Her name was on it.

Miss Finch,
If you are the one who can see color as they claim, I should like to meet you. Bring the matched ribbon and one of your own choosing tomorrow at nine. Use the servants'' entrance.

E. Harrington

Elsie laughed once, sharp as a cough. Ladies did not summon dyer girls by name. Ladies summoned masters. Still, she tucked the note into her boot and wrapped the ribbon in oilcloth.

At nine she stood at the Harrington house''s side door, skirt scrubbed, hands reddened despite lye soap. A maid led her to a sunroom where bolts of fabric lay across tables like sleeping swans. Lady Eleanor Harrington entered in a plain gray dress and a practical expression.

You matched it, she said, lifting Elsie''s ribbon to the window. Perfectly. Harrow takes credit, I assume.

That is his profession, my lady, Elsie said.

Lady Eleanor smiled without kindness. Mine is choosing who gets seen. She gestured to a sketchbook on the table, pages of gown designs edged with color notes. I need a color assistant for the season. Someone who knows what dyes truly do, not what gentlemen imagine they do.

Elsie stared at the sketchbook. Outside, a carriage rattled over cobbles. In her mind she saw Number Nine''s steaming vats, Mina''s orange divided in thirds, Ruth''s ink-stained fingers. She also saw another life: cleaner air, steadier pay, perhaps enough coin to keep her brother in school past twelve.

I will come three days a week, she said, surprising herself with the firmness of it. And I keep my place at the yard.

Lady Eleanor raised an eyebrow, then nodded. Ash and indigo, then. We shall make a modern blue.

That evening Elsie returned to Dyer''s Court before shift change, tucked her new contract into the lining of her bodice, and stirred the vat while dawn light crept over the bricks. The cloth emerged not royal, not navy, but something livelier, a blue that remembered violet and smoke and wanted a future. She smiled into the steam and kept stirring.'
    )
) as stories(writer_n, title, body)
  on stories.writer_n = sw.writer_n;

commit;

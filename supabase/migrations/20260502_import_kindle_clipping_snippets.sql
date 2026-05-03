begin;

-- Imports cleaned Kindle/TextEdit clippings as private external snippets.
-- Generated from: /Users/moc/Library/Mobile Documents/com~apple~TextEdit/Documents/clipping.txt
-- Parsed candidates: 526
-- Vocabulary/short-form candidates included: 56
-- Sources: 27
--
-- This is content seed data packaged as an idempotent migration for one-shot import.
-- It intentionally removes Kindle header clutter but keeps single-word vocabulary clippings.
--
-- This migration targets the sole current teacher/superadmin account:
--   dr.mark.oconnor@googlemail.com
--
-- It raises if that teacher profile is not present, rather than falling back to another user.

do $$
declare
  target_teacher_id uuid;
  imported_count integer;
begin
  select p.id
  into target_teacher_id
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role::text in ('teacher', 'admin')
    and lower(u.email) = lower('dr.mark.oconnor@googlemail.com')
  limit 1;

  if target_teacher_id is null then
    raise exception 'No teacher/admin profile found for dr.mark.oconnor@googlemail.com.';
  end if;

  with imported as (
    select *
    from jsonb_to_recordset($kindle_import$[
  {
    "text": "Ah, when to the heart of man Was it ever less than a treason To go with the drift of things,",
    "note": "",
    "source_title": "Poems of Robert Frost. Large Collection, includes A Boy's Will, North of Boston and Mountain Interval",
    "source_author": "Robert Frost",
    "locator_type": null,
    "locator": null,
    "highlight_color": null,
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "We washed down our mutton-stew & apple-dumpling with small ale brewed",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "10",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Peace, though beloved of our Lord, is a cardinal virtue only if your neighbours share your conscience.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "16",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "mulatto",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "16",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "extirpation,",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "16",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "simulacrums",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "17",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "divers",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "17",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "I come to my journal as a Catholick to a confessor.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "18",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "My bruises, cuts, muscles & extremities groaned like a court-room of malcontent litigants.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "20",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "basilisk",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "20",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "pellucid",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "21",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "fo’c’sle",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "23",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "ornery",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "23",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "bowsprit?",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "23",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "appurtenances",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "24",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "desiderata",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "26",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "The cacophony of timbers creaking, of masts swaying, of ropes flexing, of canvas clapping, of feet on decks, of goats bleating, of rats scuttling, of the pumps beating, of the bell dividing the watches, of mêlées & laughter from the fo’c’sle, of orders, of windlass shanties & of Tethys’ eternal realm; all lulled me as I calculated how best I could convince Cpt. Molyneux of my innocence",
    "note": "of repeated",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "28",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "‘shouting-staffs’ whose magical wrath could kill a man across the beach;",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "30",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "scrofula",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "30",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "everywhere he observed that casual brutality lighter races show the darker.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "31",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "condign",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "32",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "instanter!’",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "33",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "blackamoor",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "34",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "percipience.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "35",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "valetudinarian",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "37",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "Lethean.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "37",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "amanuensis,",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "45",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "carapaces,",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "47",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "louche",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "51",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "memsahibs",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "55",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "The east wing, however, is a comfortable little warren, though its roof timbers creak like a ship when the wind’s up. There’s a moody central-heating system and rudimentary electricity that gives one crackling electric shocks from the light switches.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "63",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "glabrous",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "72",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "Taciturn",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "73",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "Next I found a backstreet church (avoided the tourist places to avoid disgruntled book dealers) of candles, shadows, doleful martyrs, incense.",
    "note": "great descfription",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "75",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "tupping",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "79",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "How vulgar, this hankering after immortality, how vain, how false. Composers are merely scribblers of cave paintings. One writes music because winter is eternal and because if one didn’t, the wolves and blizzards would be at one’s throat all the sooner.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "82",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "obstreperous",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "84",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "tumuli.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "84",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "yorkered,",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "466",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "couldn’t tell C-major from a sergeant-major.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "472",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "One may transcend any convention, if only one can first conceive of doing so.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "479",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Cerberus",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "482",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "Certainties. Strip back the beliefs pasted on by governesses, schools and states, you find indelible truths at one’s core.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "489",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "As Henry & I ate supper, a blizzard of purplish moths seemed to issue from the cracks in the moon, smothering lanterns, faces, food & every surface in a twitching sheet of wings.",
    "note": "",
    "source_title": "Cloud Atlas",
    "source_author": "David Mitchell",
    "locator_type": "Page",
    "locator": "493",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "On a certain Tuesday the course of his triumphs was rudely broken. Mr Tate, the English master, pointed his finger at him and said bluntly:This fellow has heresy in his essay. A hush fell on the class. Mr Tate did not break it but dug with his hands between his crossed thighs while his heavily starched linen creaked about his neck and wrists. Stephen did not look up. It was a raw spring morning and his eyes were still smarting and weak. He was conscious of failure and of detection, of the squalor of his own mind and home, and felt against his neck the raw edge of his turned and jagged collar.",
    "note": "",
    "source_title": "Portrait of a young man",
    "source_author": "James Joyce",
    "locator_type": null,
    "locator": null,
    "highlight_color": null,
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "the leaves of the poisoned shrubs striped yellow-green like a cantaloupe melon.",
    "note": "",
    "source_title": "Beyond Black (The Perennial Collection)",
    "source_author": "Hilary Mantel",
    "locator_type": "Page",
    "locator": "1",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Dim lights shine from tower blocks, from passing helicopters, from fixed stars. Night closes in on the perjured ministers and burnt-out paedophiles, on the unloved viaducts and graffitied bridges, on ditches beneath mouldering hedgerows and railings never warmed by human touch.",
    "note": "",
    "source_title": "Beyond Black (The Perennial Collection)",
    "source_author": "Hilary Mantel",
    "locator_type": "Page",
    "locator": "2",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "As she turned it the right way out, she felt a tiny stir of disgust, as if flesh might be clinging to the seams.",
    "note": "",
    "source_title": "Beyond Black (The Perennial Collection)",
    "source_author": "Hilary Mantel",
    "locator_type": "Page",
    "locator": "3",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They hoped for a better boyfriend than the one they’d got – more socialised, less spotty: or at least, one who wasn’t on remand.",
    "note": "",
    "source_title": "Beyond Black (The Perennial Collection)",
    "source_author": "Hilary Mantel",
    "locator_type": "Page",
    "locator": "7",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "So: time to work the room.",
    "note": "use of colon after so",
    "source_title": "Beyond Black (The Perennial Collection)",
    "source_author": "Hilary Mantel",
    "locator_type": "Page",
    "locator": "16",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "On a good night, you can hear the scepticism leaking from their minds, with a low hiss like a tyre deflating.",
    "note": "",
    "source_title": "Beyond Black (The Perennial Collection)",
    "source_author": "Hilary Mantel",
    "locator_type": "Page",
    "locator": "21",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "There was something about these summer nights, summer nights in small towns, that made you feel that you were seventeen again, and had chances in life.",
    "note": "",
    "source_title": "Beyond Black (The Perennial Collection)",
    "source_author": "Hilary Mantel",
    "locator_type": "Page",
    "locator": "23",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "There’s a lot of sadness in hotel rooms, soaked up by the soft furnishings: a lot of loneliness and guilt and regret.",
    "note": "",
    "source_title": "Beyond Black (The Perennial Collection)",
    "source_author": "Hilary Mantel",
    "locator_type": "Page",
    "locator": "33",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "At these times, Colette felt for her; she was not without feeling, though life had pushed her pretty far in that direction.",
    "note": "",
    "source_title": "Beyond Black (The Perennial Collection)",
    "source_author": "Hilary Mantel",
    "locator_type": "Page",
    "locator": "36",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "there’s an awareness of not looking at each other, lest their look should reveal a bleakness that would discredit others).",
    "note": "",
    "source_title": "New Selected Stories (Vintage Classics)",
    "source_author": "Alice Munro",
    "locator_type": "Location",
    "locator": "1,440",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "streets—she felt as if she had become an urban person, someone detached and solitary, who lived in the glare of an important dream.",
    "note": "",
    "source_title": "New Selected Stories (Vintage Classics)",
    "source_author": "Alice Munro",
    "locator_type": "Location",
    "locator": "1,527",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Pauline came from a family that took things so seriously that her parents had got a divorce.",
    "note": "",
    "source_title": "New Selected Stories (Vintage Classics)",
    "source_author": "Alice Munro",
    "locator_type": "Location",
    "locator": "1,636",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "get used to until it’s only the past she’s grieving for and not any possible present.",
    "note": "",
    "source_title": "New Selected Stories (Vintage Classics)",
    "source_author": "Alice Munro",
    "locator_type": "Location",
    "locator": "1,985",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Her hair had been long and wavy and brown then, natural in curl and colour, as he liked it, and her face bashful and soft—a reflection less of the way she was than of the way he wanted to see her.",
    "note": "",
    "source_title": "New Selected Stories (Vintage Classics)",
    "source_author": "Alice Munro",
    "locator_type": "Location",
    "locator": "9,390",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Dazzling patches of water lay in the fields, and the sunlight was pouring down through the naked branches.",
    "note": "",
    "source_title": "New Selected Stories (Vintage Classics)",
    "source_author": "Alice Munro",
    "locator_type": "Location",
    "locator": "9,399",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Her spikes of corn-coloured hair didn’t suit her bony bare face, but it didn’t matter.",
    "note": "",
    "source_title": "New Selected Stories (Vintage Classics)",
    "source_author": "Alice Munro",
    "locator_type": "Location",
    "locator": "9,407",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Maggie’s hair was pepper-and-salt, cropped close to her head. She was tall, flat-chested, cheerful, and opinionated.",
    "note": "",
    "source_title": "New Selected Stories (Vintage Classics)",
    "source_author": "Alice Munro",
    "locator_type": "Location",
    "locator": "9,542",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "“Good morning,” he said, in a loud, sarcastically polite voice. And she said good morning, in a voice that pretended not to notice his.",
    "note": "",
    "source_title": "New Selected Stories (Vintage Classics)",
    "source_author": "Alice Munro",
    "locator_type": "Location",
    "locator": "9,646",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Did every marriage degenerate into vaudeville?",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "57",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "In the chrome of the refrigerator she caught the reflection of her own face, part brunette Shelley Winters, part potato, the finely etched sharps and accidentals beneath her eyes a musical interlude amid the bloat.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "242",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A woman had to choose her own particular unhappiness carefully. That was the only happiness in life: choosing the best unhappiness. An unwise move and, good God, you could squander everything.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "247",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "RAGE HAD ITS medicinal purposes, but she was not wired to sustain it, and when it tumbled away loneliness engulfed her, grief burning at the center with a cold blue heat.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "256",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "I felt I was a person of my word, and by saying something I would make it so. It was less like integrity, perhaps, and more like magic.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "366",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Now I was coming to realize that a lot of people baffled this guy, and that I would be next to become incomprehensible and unattractive.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "377",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "But we were inadequate as a pit crew, for ourselves or for anyone else.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "480",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "My appetite, too, shrank to a small pebble and sat in stony reserve in the place my heart had been and to which my heart would at some point return, but just not in time for dessert.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "494",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "“You’re supposed to give things up for Lent. Last year, we gave up our faith and reason. This year, we’re giving up our democratic voice and our hope.”",
    "note": "whaft did you vgive up cfor lent hope",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "541",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "And so Zora’s laughter, in conjunction with her beauty, doomed him a little, made him grateful beyond reason.",
    "note": "dedvelilp as a cursde for all men",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "577",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Zora asked finally, as if she had asked it many times before, her tone a mingling of weariness and the cheery pseudo-professionalism of someone in the dully familiar position of being single and dating.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "646",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He had no idea why he said half the things he said.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "683",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Oh, the beautiful smiles of the insane.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "784",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "“You smell good.” Some mix of garlic and citrus and baby powder overlaid with nutmeg.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "789",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The menu, like love, was full of delicate, gruesome things—cheeks, tongues, thymus glands.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "989",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "All his tinpot miseries and chickenshit joys would lead him once again to Sparky’s.",
    "note": "shubstitute sparkhys",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,022",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She let her life get dull–dull, but with Hostess cakes.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,058",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "There were moments bristling with deadness, when she looked out at her life and went “What?”",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,058",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She hadn’t been given the proper tools to make a real life with, she decided, that was it. She’d been given a can of gravy and a hairbrush and told, “There you go.” She’d stood there for years, blinking and befuddled, brushing the can with the brush.",
    "note": "adapt with different nouns and resumtantverbs",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,060",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "One of the problems with people in Chicago, she remembered, was that they were never lonely at the same time.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,063",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She took to staring out the window at Lake Michigan, the rippled slate of it like a blackboard gone bad.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,069",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "her sweet, dry skin, the gray peach fuzz on her neck.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,100",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She was starting to have two speeds: Coma and Hysteria.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,106",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "want to sleep with someone. When I’m sleeping with someone, I’m less obsessed with the mail.”",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,152",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "HE BEGAN TO REALIZE, soon, that she did not respect him. A bug could sense it. A doorknob could figure it out.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,176",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "life of children and lawn mowers and grass clippings,",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,180",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She had made too little of her life. Its loneliness shamed her like a crime.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,203",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "“I think I’m hard of hearing,” he said. “I think I’m hard of talking,” she said.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,262",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Something dark and coagulated moved through her, up from the feet.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,300",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "No matter what terror or loveliness the earth could produce—winds, seas—a person could produce the same, lived with the same, lived with all that mixed-up nature swirling inside, every bit. There was nothing as complex in the world—no flower or stone—as a single hello from a human being.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,457",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "she gunned the motor to pass a tractor on a curve. LOOSE CHIPPINGS said the sign. HIDDEN DIP. But Abby’s mother drove as if these were mere cocktail party chatter.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,491",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "it deprived her of courage. But it gave her bitterness and impulsiveness, which could look like the same thing.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,537",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "prolix",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,590",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "and then we watch as Chappers sniffs at the roots of an oak.",
    "note": "the dog a nice bit of abchiring",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,637",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It was a body walled in the cellar of her, a whiff and forecast of doom like an early, rotten spring—and",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,775",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Out the window, there was an afternoon moon, like a golf ball, pocked and stuck. She looked at the calcified egg of it, its coin face, its blue neighborhood of nothing.",
    "note": "mon a.metalhkor fkr iut kf place",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,839",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "though the lightning ripped open the night and lit the trees like things too suddenly remembered, then left them indecipherable again in the dark.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,853",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "“Eric Clapton would never have sat in a Woolworth photo booth like some high school girl,” Olena had said once, in the caustic blurt that sometimes afflicts the shy.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,877",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "in an attempt at extroversion, she had worn a tunic with large slices of watermelon depicted on the front. What had she been thinking of?",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,893",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "moving his hair gently, like weeds in water.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,908",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They were not kind. They played around and lied to their spouses. But they recycled their newspapers!",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "1,965",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "through the thunder leaving and approaching like a voice,",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,026",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She eyed Agnes’s outfit as if it might be what in fact it was: a couple of blue things purchased in a department store in Cedar Rapids.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,043",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She moved her mouth in a concerned and exaggerated way, like a facial exercise.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,046",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He had never acquired the look of maturity anchored in sorrow that burnished so many men’s faces.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,130",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "it was then that she first felt all the dark love and shame that came from the pure accident of home, the deep and arbitrary place that happened to be yours.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,172",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "see up close the variously hued spokes of his irises,",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,198",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "SPRING SETTLED FIRMLY in Cassell with a spate of thundershowers. The perennials—the myrtle and grape hyacinths—blossomed around town in a kind of civic blue,",
    "note": "good detail",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,233",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Every arrangement in life carried with it the sadness, the sentimental shadow, of its not being something else, but only itself:",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,270",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "When she was younger, she was a frustrated, mean mother, and so she is pleased when her children act as if they don’t remember.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,413",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He doesn’t know a show tune from a chauffeur.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,443",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "really don’t think that’s true,” she said a little wildly, perhaps with too much fire and malt in her voice.",
    "note": "niceaddition ofbthealcohol",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,489",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "through all the stages of bereavement: anger, denial, bargaining, Häagen-Dazs, rage.",
    "note": "funny",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,490",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She tried to find his hand under the covers, then just gave up.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,506",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "ornery",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,526",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "palimpsest",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,773",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "He feels the sickened sensation he has sometimes felt after killing a housefly and finding blood in it.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,867",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "in the cool wintry light that sometimes claimed those last days of August—the",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,896",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "always hits him the same personal way: like something familiar but lost, something momentous yet insignificant—like an act of love with a girl he used to date.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,923",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Beneath all his eccentricities, he possessed a streak of pragmatism so sharp and deep that others mistook it for sanity.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,944",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "“has been known to mumble at the edges”—then",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,951",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "had gone through a pig’s life of everything tearing at his feelings,",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,973",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "maybe because the earth had tilted into shadow and cold and the whole damned future seemed dipped in that bad ink,",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,973",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "In general, people were not road maps. People were not hieroglyphs or books. They were not stories. A person was a collection of accidents. A person was an infinite pile of rocks with things growing underneath.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "2,999",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A boneyard had its own insistent call: like rocks to sailors, or sailors to other sailors.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,124",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "am a man upon the land, he thinks. But here at sea, what am I? Shrieking or feeding?",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,155",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "which fills Mack’s ears with light.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,164",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "frozen air makes things untouchable, unsmellable. When the weather warms, the world comes back.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,174",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "“See what you miss, being a Yankee,” says Mack. “Missing is all I do,” says Quilty.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,177",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It wasn’t true what they said about bees. They were not all that busy. They had time. They could wait. It was a myth, that stuff about busy as a bee.",
    "note": "could useas a template fir itheranijmals",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,211",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The world—one cannot drive fast or far enough away from it—is coming at him in daggers.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,215",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "the irretrievable loss of each afternoon, the encroaching darkness, each improvised day over with at last—only",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,249",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "a checker in a game of checkers, or a joke in a book of jokes.",
    "note": "other dexamples?",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,250",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A city currently known for its prostitutes—Las Vegas, Amsterdam, Washington, D.C.—is seldom a good food city.”",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,280",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "grebes, blackbirds, sherbet-winged flamingos fly in low over the feathery bulrushes.",
    "note": "nice detail",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,309",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He has a brief nervous breakdown and shouts from every shattered corner of it,",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,319",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He feels his own head shrink with the hate that is love with no place to go.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,373",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "But he will do it anyway, or what is he? Pond scum envying the ducks.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,380",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He has no script, no reliable sense of stage, just a faceful of his heart’s own greasepaint and a relentless need for applause.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,391",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "What she was feeling was too strange, too contrary, too isolated for a mere emotion. It had to be a premonition—one",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,401",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "At all the funerals for love, love had its neat trick of making you mourn it so much, it reappeared.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,457",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "in the circuitous syntax and ponderous Louisiana drawl that, like so much else about him, had once made her misty with desire and now drove her nuts with scorn.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,470",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "this way—a wedding of emotionally handicapped parking spaces, an arduously tatted lace of property and irritation—they’d managed to stay married.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,478",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "With its sweet, urgent beginnings, and grateful, hand-holding end, marriage was always its worst in the middle: it was always a muddle, a ruin, an unnavigable field.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,481",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "made his blood move around his face and neck like a lava lamp.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,571",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "EVERY HOUSE is a grave, thought Ruth. All that life-stealing fuss and preparation. Which made moving from a house a resurrection—or an exodus of ghouls, depending on your point of view—and made moving to a house (yet another house!) the darkest of follies and desires.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,607",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Noel pointed to the bridal-wreath hedge, which was joyously blooming from left to right, from sun to shade, and in two weeks would sag and brown in the same direction. “Ah, marriage,”",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,638",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It was the kind of place where the squirrel mafia would have dumped their offed squirrels.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,663",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They buried the whacked bats in tabbouleh containers, in the side yard: everything just tabbouleh in the end.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,678",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "when Ruth was sitting inside drinking tea so hot it skinned her tongue,",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,771",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Suddenly, he thought he felt the yearning heart of civilization in him, felt at last, oh, Nitchka, what human experience on this planet was all about: its hard fiery center, a quick rudeness in its force; he could feel it catching him, a surprise, like a nail to the brain. A dark violet then light washed over him. Everything went quiet.",
    "note": "good description of being shot",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,847",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "intestines no longer curled neat and orderly as a French horn, but heaped carelessly upon one another like a box of vacuum-cleaner parts.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,875",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The body, hauling sadnesses, pursued the soul, hobbled",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,880",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "the Mother feels the entirety of her love as worry and heartbreak. A quick and irrevocable alchemy:",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "3,983",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Then it is a fierce little country abducting you; it holds you squarely inside itself like a cellar room—the best boundaries of you are the boundaries of it. Are there windows? Sometimes aren’t there windows?",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,002",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "and then I realize something has occurred that can never ever be over.”",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,048",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "In the end, you suffer alone.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,057",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "IN THE TINY ROOM that is theirs, she sleeps fitfully in her sweatpants, occasionally leaping up to check on the Baby. This is what the sweatpants are for: leaping.",
    "note": "surreal butsort of has a meaning",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,156",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The very specificity of a question would give a lie to the overwhelming strangeness of everything around her.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,175",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "There is a giant clock on the far wall. It is a kind of porthole into the operating room, a way of assessing the Baby’s ordeal:",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,205",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The authority he attempts to convey, he cannot remotely inhabit. He is not even in the same building with it.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,266",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The Husband looks at her blankly, a mix of disorientation and divorce.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,270",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "a hospital merely an intensification of life’s cruel obstacle course.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,282",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "has anyone properly sung the praises of sighs of relief?",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,300",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Overheard, or recorded, all marital conversation sounds as if someone must be joking, though usually no one is.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,321",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "In a life where there is only the bearable and the unbearable, a sigh of relief is an ecstasy.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,377",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "the creamy incisors curved as cashews.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,611",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Adrienne, in this temporary dissolve, seeing death and birth, seeing the beginning and then the end, how they were the same quiet black, same nothing ever after:",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,774",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "blinded by the angle of the afternoon light",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,778",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It seemed truer, more familiar to the soul than was the busy, complicated flash that was normal life.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,834",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Near a particularly exuberant rhododendron sat a short, dark woman with a bright turquoise bandanna knotted around her neck.",
    "note": "packed with description",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,861",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It would be a brief affair, a little nothing; a chat on the porch at a party.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,936",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She would hug her parents good-bye, the gentle, emptied sacks of them, and think Where did you go? Time, Adrienne thought. What a racket.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "4,980",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She tried not to let the refrigerated smell follow her in the door, up the stairs, the vague shame and hamburger death of it,",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,010",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They had begun to do imitations of each other, that most violent and satisfying end to love.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,101",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She stood and kissed his ear, which was a delicate thing, a sea creature with the wind of her kiss trapped inside.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,116",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "“See ya,” a small mat of Dixie cup and gum stuck to one shoe.",
    "note": "great detail",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,160",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She wrapped the phone cord around one leg, which she had lifted into the air for exercise.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,181",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Blisters and sores. Poultices of algae paste. The water tight as glass and the wind, blue-faced, holding its breath. How did one get here? How did one’s eye-patched, rot-toothed life lead one along so cruelly, like a trick, to the middle of the sea?",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,203",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He started not to mind it, to feel he was suited in some ways to solitude, to the near weightlessness of no one but himself holding things down.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,288",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He roamed the streets, like the homeless people, like the junkies and hookers with their slow children and quick deals,",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,332",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "THERE IS A WAY of walking in New York, midevening, in the big, blocky East Fifties, that causes the heart to open up and the entire city to rush in and make a small town there.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,465",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Heffie’s face was a snowy moon of things never done.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,745",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The world was lovely, really, but it was tricky, and peevish with the small things, like a god who didn’t get out much.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,866",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "the strain and ambition of always having been close but not quite. There was too much effort with the eyeliner, and her earrings, worn no doubt for the drama her features lacked, were a little frightening, jutting out from the side of her head like antennae.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,887",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "wasn’t irony. What is your perfume? a student once asked her. Room freshener, she said.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,899",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Her students were by and large good Midwesterners, spacey with estrogen from large quantities of meat and cheese.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,900",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They shared their parents’ suburban values; their parents had given them things, things, things. They were complacent. They had been purchased.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,901",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They were armed with a healthy vagueness about anything historical or geographic.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,902",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "In New Geneva you weren’t supposed to be critical or complain. You weren’t supposed to notice that the town had overextended and that its shopping malls were raggedy and going under. You were never to say you weren’t fine thank you and yourself. You were supposed to be Heidi. You were supposed to lug goat milk up the hills and not think twice. Heidi did not complain. Heidi did not do things like stand in front of the new IBM photocopier, saying, “If this fucking Xerox machine breaks on me one more time, I’m going to slit my wrists.”",
    "note": "Swap this for Qatar - it’s hilarious",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,913",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "But soon she came to realize that all men, deep down, wanted Heidi. Heidi with cleavage. Heidi with outfits.",
    "note": "ned alternative yet ico nic replacemrnt for heidi",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,941",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She flicked an ant from her sleeve.",
    "note": "excelldrnt throwaway line",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "5,944",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The trick to flying safe, Zoë always said, was never to buy a discount ticket and to tell yourself you had nothing to live for anyway, so that when the plane crashed it was no big deal. Then, when it didn’t crash, when you had succeeded in keeping it aloft with your own worthlessness, all you had to do was stagger off, locate your luggage, and, by the time a cab arrived, come up with a persuasive reason to go on living.",
    "note": "Could use this technique where opinion of state of success could be applied to any activity",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "6,022",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Earl stepped out onto the balcony, a bonehead and a naked woman, the night air roaring and smoky cool.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "6,094",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "“Well,” sighed Zoë anxiously. She had to learn not to be afraid of a man, the way, in your childhood, you learned not to be afraid of an earthworm or a bug.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "6,097",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "conniptions.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "6,199",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "the clover outlines of the peppers, the clock stares of the tomato slices.",
    "note": "look for other examples of food sexcribehis way",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "6,291",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They seem to all have one face—giant and blank as a vandalized clock.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "9,683",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "BEGIN TO WONDER what you do write about. Or if you have anything to say. Or if there even is such a thing as a thing to say. Limit these thoughts to no more than ten minutes a day; like sit-ups, they can make you thin.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "9,743",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "You will read somewhere that all writing has to do with one’s genitals. Don’t dwell on this. It will make you nervous.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "9,745",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "then we toss like dinghies.",
    "note": "reference tk a fight",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "9,829",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "you live if you dance to the voice that ails you.",
    "note": "",
    "source_title": "The Collected Stories of Lorrie Moore",
    "source_author": "Lorrie Moore",
    "locator_type": "Location",
    "locator": "9,958",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "This is how it begins. A rivet fails, one of eight which should clamp the joint between two weight-bearing girders on the western side of the pier.",
    "note": "Great tension builder",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "2",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The boy is in some private hell which he will never entirely leave.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "7",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Eight minutes. Fifty-nine dead.",
    "note": "Good technique to show passage of time",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "7",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Fourteen minutes. Sixty dead.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "8",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Her name is Renée. They will stay in touch with one another for the next thirty years.",
    "note": "Interesting technique to mention a swathe of future events",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "10",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Other boats are being drawn towards the pier, a Bristol motor cruiser, an aluminium launch with a Mercury outboard, two fibreglass Hornets.",
    "note": "Nice details",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "11",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "moraine",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "11",
    "highlight_color": "Blue",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "SHE’S DREAMING",
    "note": "rdepeated use ikfshes dreamin g for several.paragraphs",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "17",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "the oars churning the waves to foam and the fat sails slapping in the wind,",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "17",
    "highlight_color": "Blue",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "painted plates heavy with roast meats and chickpeas, quinces and saffron and honey cakes.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "17",
    "highlight_color": "Blue",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She’s dreaming",
    "note": "Lots of paragraphs starting with this...",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "17",
    "highlight_color": "Blue",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "snowfall of Egyptian cotton on the bed.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "17",
    "highlight_color": "Blue",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "When time begins again",
    "note": "nicde say ti illustrate someine vin distress",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "19",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "but every thought of him is a knife turning in the wound love made.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "19",
    "highlight_color": "Blue",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She wraps herself in the rug from the tent floor and walks round the perimeter of the island, a figure of eight with two stony beaches on either side of its narrow waist. It takes her two hours. There are no trees, only clumps of low thorn bushes bent flat by the wind, green cushions of mossy thrift, bracken and sea campions, razorbills and butterflies.",
    "note": "good tight description",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "26",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "but it is a group of seals lying beached on a thin promontory, half-fish, half-dog, their wet skins like mottled gemstones.",
    "note": "good simile - look for bopportunities for this",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "27",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She had never seen darkness eat up the world like this.",
    "note": "abstract noun performing an action works well",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "30",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "understanding perhaps that isolation was both the cruellest and the easiest punishment they could inflict.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "51",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "But you never did leave the estate, not really. You carried a little bit of it inside you wherever you went, something grubby and broken and windswept.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "55",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "the same way he had coped with her mother, in the same way he had coped with being a parent, by looking the other way and concentrating very hard on something of no importance whatsoever.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "56",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Bunny liked her to read the paper out loud. He liked to beat her at chess and lose to her at Monopoly. They watched DVDs she picked up from the bargain box in Blockbuster.",
    "note": "good detailed syart to paragraph",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "62",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It was the end of summer, but instead of cool winds and rainy days a thick grey cloud settled over the town so that the air felt tepid and second-hand.",
    "note": "second hand - constantly look for these opportubities",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "64",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "On the dusty sill sat a pair of rusty nail clippers, a dog-eared box of sticking plasters and a little brown tub of diazepam tablets with a water-blurred label.",
    "note": "nice concise details",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "67",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "an owl made of yellow glass, a box of tarnished apostle spoons on faded purple plush, a decorative wall plate with a view of Robin Hood’s Bay.",
    "note": "nice details - take thedse and change the adjectivdes",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "69",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The woman facing her had sunglasses pushed up into an auburn crop, tanned shoulders and a canary-yellow dress to show them off.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "69",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She went to Sainsbury’s and bought a chicken jalfrezi and pilau rice, a king prawn masala and some oven chips. She bought two tins of treacle pudding, two tubs of Taste the Difference vanilla custard and a bottle of Jacob’s Creek Cool Harvest Shiraz Rosé.",
    "note": "details deatails details",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "72",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "‘I’m not leaving.’ ‘Really?’ He spoke very quietly, as if her decision were a house of cards which might collapse at any minute.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "72",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It lies in Advent calendar curves on windowsills.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "80",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They can smell him now, more agricultural than homeless. Leather, dung and smoke, something very old about it, Mongol horses on the high steppe. Yurts and eagles. His greatcoat is Napoleonic, scuffed black serge with actual brass buttons and a ragged hem. Snow melts on his shoulders.",
    "note": "god detail",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "92",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "despite the weight everyone could sense when it touched the surface of the table.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "93",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He has the fuzzy, pained look of someone waking to a heavy-duty hangover.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "101",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "What troubles him is that he cannot see a way in which these events might be turned to his advantage, and this is a situation he has not been in before.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "108",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "an apology on someone else’s behalf wasn’t a real apology.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "109",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "David stares at him with the utter contempt of the young,",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "111",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "if someone snaps your olive branch then you are surely allowed to poke them with the broken end,",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "119",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Gavin tries to reach them but the intervening air is viscous",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "121",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She has a chestnut bob. She wear jeans and a cream woollen poncho. Her feet are bare. He recognises her but is equally convinced that they have never met. Panic flutters in his chest. He wonders if he has been in this place for years and this encounter has happened hundreds of times before only to be forgotten repeatedly.",
    "note": "use this style for characters in exftrem.e situations",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "135",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He will be sitting at dusk on the terrace of a rented house near Cahors with his eight-year-old son when they see a barn on the far side of the valley destroyed by lightning, the crack of white light appearing to come not from the sky but to burst from the ground beneath the building.",
    "note": "a min flash foreard - tbhis is a Hadden technjque adds a sense ikf mystdrryaundserlines the omnjipotence of thenarrator",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "146",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Sean’s jumbled silhouette assembles itself in the patterned glass of the front door and it swings open.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "147",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Daniel steps off the avocado lino of the hall onto the swirly red carpet of the bedroom.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "148",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It feels like the bedroom of a dead person in a film, every object heavy with significance.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "148",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Later in life when he is describing his parents to friends and acquaintances he will never find quite the right word.",
    "note": "Haddon huses tbhis technique a lot -adds mystery",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "149",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "There is a faint brown smog, as if the sky needs cleaning.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "150",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "moraine",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "150",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "He has a biscuity unwashed smell and bones that look slightly too big for his skin.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "151",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It’s a trick of the light, of course. Time is nothing but forks and fractures. You step off the kerb a moment later. You light a cigarette for the woman in the red dress. You turn over the exam paper and see all the questions you’ve revised, or none of them. Every moment a bullet dodged, every moment an opportunity missed.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "159",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She has never found Arvind attractive but he has skin so smooth and flawless it looks like suede and sometimes she wants to reach out and stroke the back of his neck. She asks what the news is from home.",
    "note": "giod use of someonevdoin g sometbhi g to someo e",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "168",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He puts his hand across his mouth, riding out a lump in his throat perhaps.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "169",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The desire to be somewhere else, which is never satisfied by being somewhere else, however far you go, though you have to go a very long way indeed to figure that one out.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "170",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Per has a birthmark on his neck precisely where the bolt would be if he were Frankenstein’s Monster.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "171",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The thought is a gale sweeping through the empty rooms of her head, slamming doors and smashing windows. Another",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "195",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She nurses an espresso in Starbucks and imagines the sour little woman from Fernandez & Charles standing in the living room wondering what the fuck to do with the exercise ball and the Balinese shadow puppet and the armchairs from Crate and Barrel.",
    "note": "grfeat detail",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "209",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The deep chime of the familiar.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "210",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "There was a lime tree just beyond the back fence. It filled the side window and when the wind gusted all the leaves flipped and changed colour like a shoal of fish.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "213",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The argument is unexpectedly satisfying, like getting a ruler under a plaster and scratching the itchy, unwashed flesh.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "216",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Sometimes, on the edge of sleep, when worlds overlap, she slips back forty years and sees the sun-shaped, bronze-effect wall clock over the fireplace",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "218",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Back inside, the radiators are hot and the house is drying out, clicking and creaking like a galleon adjusting to a new wind.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "221",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Her skin has a sticky patina, like an old leather glove.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "222",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Her mother’s skin is busy with blotches and lesions in winey purples and toffee browns,",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "223",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Minimal concrete benches, rectangular pond, lilac and callery pear, wind roughening the surface of the water.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "230",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "the sedative of physical work that finally comforts her.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "235",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Was it really possible to destroy someone’s life by giving them a bath and cleaning their house? Could a life really be held together by dirt and disorder?",
    "note": "nice technique of writibg quesgtions",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "237",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She returns to the television. Columbo, Friends.",
    "note": "nicr drippong in of old programs",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "238",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "this panoramic view of our one, shared sky connected me to other people and other places and thereby lifted my spirits a little.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "246",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "I had the unsettling sensation that he had removed a mask he had been wearing for many years.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "249",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He had the air of a ringmaster, I thought, thumbs hooked into his waistcoat, a voice slightly too big for the room.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "254",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "maw.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "257",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "There was a brief pause, then a faint susurration from the mouth of the cave, like the long receding of a wave on a gravel beach.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "260",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "as if a chapter from the book of myself had been torn out and thrown away.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "268",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "felt myself observed and judged by an invisible audience composed of those people whose good opinions I have always sought",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "270",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "One of those spring days that seem warm and cold at the same time.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "275",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Enough blue to make a pair of sailor’s trousers.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "275",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The world shifting too fast in ways he doesn’t understand, values he’d grown up with become vaguely comic:",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "277",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Her blonde hair rises like a candle flame.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "279",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He starts the ignition and twists the heater to max. A burst of Garth Brooks till he hits the off button.",
    "note": "niced detail",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "283",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He parks outside the house and leaves the engine running and there is a moment of balance when the day could roll either way,",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "283",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "that lives are held in common, that we lose a little something of ourselves with every death.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "288",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He can hear the deep, dull sluice of his blood in his ears and behind it, far away, that faint high whine, not really a noise at all, the background radiation of the mind.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "292",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "‘Friends’ is the wrong word. She’s twenty-four, he’s fifty-three. Maybe there isn’t a right word.",
    "note": "",
    "source_title": "The Pier Falls",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "295",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The Brothers Karamazov (Centaur Classics) [The 100 greatest novels of all time - #8] Fyodor Dostoyevsky He would probably have succeeded, merely from her moral fatigue and desire to get rid of him, and from the contempt and loathing he aroused by his persistent and shameless importunity. As a general rule, people, even the wicked, are much more naïve and simple-hearted than we suppose. And we ourselves are, too. “Those innocent eyes slit my soul up like a razor,” he used to say afterwards, with his loathsome snigger. aquiline. abnegation, he understood that for the humble soul of the Russian peasant, worn out by grief and toil, and still more by the everlasting injustice and everlasting sin, his own and the world’s, it was the greatest need and comfort to find some one or something holy to fall down before and worship. An outer show elaborated through centuries, and nothing but charlatanism and nonsense underneath,” “The elder Varsonofy did sometimes seem rather strange, but a great deal that’s told is foolishness. There is silent and long-suffering sorrow to be met with among the peasantry. It withdraws into itself and is still. But there is a grief that breaks out, and from that minute it bursts into tears and finds vent in wailing. Lamentations comfort only by lacerating the heart still more. Such grief does not desire consolation. It feeds on the sense of its hopelessness. Lamentations spring only from the constant craving to reopen the wound. the more I detest men individually the more ardent becomes my love for humanity.’ ” The socialist who is a Christian is more to be dreaded than a socialist who is an atheist.’ His rather large, prominent, dark eyes had an expression of firm determination, and yet there was a vague look in them, too. asperse gudgeon. Humanity will find in itself the power to live for virtue even without believing in immortality. It will find it in love for freedom, for equality, for fraternity.” archimandrite Miüsov, as a man of breeding and delicacy, could not but feel some inward qualms, when he reached the Father Superior’s with Ivan: No, saintly monk, you try being virtuous in the world, do good to society, without shutting yourself up in a monastery at other people’s expense, and without expecting a reward up aloft for Her broad, healthy, red face had a look of blank idiocy A308 block 2 5.5 She was indwelling in every board and stone of it: every fold in the curtains had a meaning (perhaps they were so folded to hide a darn or stain); every room was a phial of revelation to be poured out some feverish night in the secret laboratories of her decisions, full of living cancers of insult, leprosies of disillusion, abscesses of grudge, gangrene of nevermore, quintan fevers of divorce, and all the proliferating miseries, the running sores and thick scabs, for which (and not for its heavenly joys) the flesh of marriage is so heavily veiled and conventually interned.",
    "note": "",
    "source_title": "The Brothers Karamazov",
    "source_author": "Fyodor Dostoyevsky",
    "locator_type": null,
    "locator": null,
    "highlight_color": null,
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Even if no one would miss me, even if I left mo blank space in anyone’s life, even if no one noticed, I couldn’y leave willingly. Loss was not a skill, not a measure of a life. And yet I still felt I had something to lose.",
    "note": "",
    "source_title": "Hard Boiled Wonderland and the End of the World",
    "source_author": "Haruki Murakami",
    "locator_type": null,
    "locator": null,
    "highlight_color": null,
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "the dockside lamps burned in the night-time a green haze, the light of a sad dream.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "3",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "piebalds",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "3",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "He walked the Arab tangle of alleyways and wynds that make up the Trace and there was the slap, the lift, the slap, the lift of Portuguese leather on the backstreet stones.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "4",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The ocean is not directly seen from the city, but at all times there is the ozone rumour of its proximity, a rasp on the air, like a hoarseness.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "7",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "These were the merchants of the city, men with a taste for hair lacquer, hard booze and saturated fats.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "9",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It has the name of an insular and contrary place, and certainly, we are given to bouts of rage and hilarity, which makes us unpredictable.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "11",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "We might as well elevate ourselves from the beasts of the fields.’",
    "note": "Biblical reference",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "11",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "it was the rhythm of them that slowed the rush of his thoughts.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "13",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Even at a little after six in the morning, the concourse was rudely alive and the throb of its noise was by the moment thickening. Amputee walnut sellers croaked their prices from tragic blankets on the scarred tile floors, their stumps so artfully displayed.",
    "note": "con trastbthis with my setting descriptions",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "14",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "he was teetering clearly on Eternity’s maw.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "14",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They were painting on bravery from snap-clasp compacts as they walked.",
    "note": "perhaps use courage",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "15",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The lowing of condemned beasts sounded in bass tones on the air",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "17",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "How, he wondered, was a man expected to think civilised thoughts in a city the likes of it?",
    "note": "good techniquevfir getting in the head if a character",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "17",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "manses",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "20",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "He wore ox-blood boots laced high, a pair of smoke-grey, pre-creased strides, and thin leather braces worn over a light blue shirt.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "20",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "There are areas too tender for even the longest marriage.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "24",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The result is a skittish, temperamental people with a tendency towards odd turns of logic.",
    "note": "precedung paragraphwasabiuthe bjting wind good technjquto link weather to a character gtrait if a group of people",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "25",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A smile from Eyes Cusack the likes of which you wouldn’t get off a stoat in a ditch.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "29",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A place should never for too long go against its nature.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "30",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Gubernatorial.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "32",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "saudade.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "33",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "The fat newsman soul-wrestled for the cheap seats.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "41",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Do you hear me clearly?’ ‘Cathedral bells,",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "41",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He was tall and straggly as an invasive weed.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "45",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They came upon the Bohane river. Feeding directly off the bog, it was a tarry run of blackwater, and it burbled its inanities.",
    "note": "anthropomorphic description of a river",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "46",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Quick as a switchblade’s flick the years had passed and she was forty-three years old.",
    "note": "other mdetaphors for quickness",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "51",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Pale, bled skies. Thunderstorms in the night. Sour-smelling dawns. It brought temptation, and yearning, and ache – these are the summer things. Note | Page: 52 tiuchesof philosophy give an air of poignancy to theseriting",
    "note": "senses",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "52",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "an odour of intense sadness,",
    "note": "sadness is a recurring thseme here as is nostalgia",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "56",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Hardwind was up, and it raged across the bog outside, and it made speeches in the stove’s flue;",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "56",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "‘Happy? Who’s happy in fuckin’ Bohane? Ya’d be a long time scoutin’ for happy in this place.’",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "58",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He lay among the stew of his thoughts a while. Now that was a murky old soup.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "59",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She was on a diet of hard booze and fat pills against the pain of her long existence.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "64",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "October was ending, the last of it falling from our diseased civic trees,",
    "note": "use of our gives thenarratir a presence",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "68",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The bassoon call of a bittern sounded – that forlorn bird",
    "note": "look up bird sounfs and think what might be assockated with them",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "84",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The great tragic armies of history had made it over storm-whipped mountain ranges quicker than Girly made it across that carpet but she persevered,",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "89",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A December Tuesday. As miserable as hell’s scullery beneath a soot-black sky.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "89",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The nerves of the city were ripped.",
    "note": "anthropomorphism.is goodtechnique",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "89",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "sentimental as a sackful of ballads.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "91",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "we are not happy, exactly, but satisfied in our despair.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "93",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "insouciance,",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "97",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "Solstice broke and sent its pale light across the Big Nothin’ bogs. A half-woken stoat peeped scaredly from its lair in a drystone wall and a skinny old doe stood alert and watchful on a limestone outcrop. Sourly lit, a cruel winter scene – a raven clan soared and watched for scavenge, and there was a slushy melt to the hillside as the distant sun burned, and a puck goat chewed morosely on a high mound there. Bohane river ran as ever it did and fed off the bog ice that quaked into it as the shortest day’s sun came still higher.",
    "note": "starts a lot vof chapters wigth description",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "116",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He could not settle. The level of drooling lust was unspeakable. Nostalgia was off the fucking charts. He was calling out his daft thoughts to the four winds. He was in fierce debate, at all angles of the clock, with the very many versions of himself. He was flatulent, he was baggy-eyed, he was hoarse with emotion.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "129",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Macu wore: A pair of suede capri pants dyed to a shade approaching the dull radiance of turmeric, a ribbed black top of sheer silk that hugged her lithe frame, a wrap of golden fur cut from an Iberian lynx, an expression of wry bemusement about the eyes, and about the mouth an expression unreadable.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "140",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The firelight traced out the lines of her aged skin. She was no longer what he needed or wanted. Reality infected him with its sourness and truth. A new course swiftly presented; it had its own sweet and vengeful logic. ‘I’ll tell you exactly why I’m here,’ he said.",
    "note": "Great cliff hanger and we have been shown something “ gone out with for three weeks” which radically alters our perception and feelings for this Gant fellow",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "145",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A hot scream cut the April night in S’town.",
    "note": "Synaesthsic start is good",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "163",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "‘Noin’ey-noine …’",
    "note": "Use of an activity being counted to suggest the passage of Time",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "168",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "‘A hundert even, Mr Gleeson!’ Moaned loudly, the Dom – shamed, yet again! – and his fat-man moan carried through the window, and floated downwards, softly, until a lick of the hardwind caught it and threw it above the rooftops of Smoketown, sent it across the blackwaters of the Bohane, and it faded as it carried, and it reduced, and it was succeeded on the Trace front by the sound of the meat wagons as they crossed the cobbles, the iron rut and clanking of them.",
    "note": "Great way to show us the and remind us of the setting and location whilst seeng a character in debased action",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "168",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Sadness was the breeze that came off the river and warmed his face.",
    "note": "Sadness features as a theme I think it is mentioned so often",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "170",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Logan Hartnett on an April morning walked the stony rut of his one-track mind:",
    "note": "great start - what is this called? Take a cliche and add a description of it that relaes to some charachteristic of a character",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "173",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He had all the handsome poignancy of heartbreak.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "174",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A lonesome kid, he would walk out the Boreen – he ghosted about the rez, the massif villages, the backlanes, the haunted cottages, their roofs all caved in. See him in a field of reeds – at ten years old – his pale face above the burning gold of the reeds caught in drenching sun, and the reeds ride slowly the sway of the wind.",
    "note": "Nice brief bit of backstory - reflective and not taking the reader out of the story",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "176",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "But the slap and parry – they both knew – had a deeper meaning in freight: it was for the consolation of touch.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "177",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "with a mango wash to the sky above the rooftops",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "195",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "‘As a bucket o’ cats,’ she said.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "209",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The horrors he had seen, and those by his own hand begotten. There was no way to escape the tingling of his past; it was ever-present, like tiny fires that burned beneath the skin.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "214",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Hot night rippled in the salon’s dense air. A slow moment passed – it had somehow a memorial taste.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "220",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Herb and sick and tawny wine were on the air.",
    "note": "NIce simple sentence thrown in - varies the [ace, sets a mood, breaks from action and dialogue",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "245",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The bluish green of wrack and lichen. The grey of flint and rockpool. The moist brown of dulse and intertidal sand.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "249",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He walked a tread of memory and regret.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "255",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The gulls squalled – mmwwaaoorrk! – and rain came in warm drifts from the August sea, and a fat merchant of the city stood on a crate to drone the night’s courtesies.",
    "note": "the action is beautifully ineterrupted by small flashes of descriptive brillliance",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "264",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The Gant walked off his nausea but not his bitterness.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "268",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Rest of us piled in like savages.",
    "note": "The author is a character int heis story - but who is he?",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "271",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "the cut yellow flowers in a vase on the Aliados countertop trembled as the sideway door opened, and stilled again as it closed, and he turned a quiet swivel on his stool.",
    "note": "Nice use of an object to show us the wind effect",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "276",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The procession moved, and the chained dogs in the merchant yards along the front cowered in the cold shadows of morning, their own thin flanks rippling with fright.",
    "note": "",
    "source_title": "City of Bohane",
    "source_author": "Kevin Barry",
    "locator_type": "Page",
    "locator": "277",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Art requires a delicate adjustment of the outer and inner worlds in such a way that, without changing their nature, they can be seen through each other.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "341",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "I feel that discussing story-writing in terms of plot, character, and theme is like trying to describe the expression on a face by saying where the eyes, nose, and mouth are.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "830",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A story is a complete dramatic action—and in good stories, the characters are shown through the action and the action is controlled through the characters, and the result of this is meaning that derives from the whole presented experience.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "839",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A story always involves, in a dramatic way, the mystery of personality.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "842",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They want to write about problems, not people; or about abstract issues, not concrete situations. They have an idea, or a feeling, or an overflowing ego, or they want to Be A Writer, or they want to give their wisdom to the world in a simple-enough way for the world to be able to absorb it.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "846",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The first and most obvious characteristic of fiction is that it deals with reality through what can be seen, heard, smelt, tasted, and touched.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "857",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "I have found that the stories of beginning writers usually bristle with emotion, but whose emotion is often very hard to determine.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "861",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Ford Madox Ford taught that you couldn’t have a man appear long enough to sell a newspaper in a story unless you put him there with enough detail to make the reader see him.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "867",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Fiction writing is very seldom a matter of saying things; it is a matter of showing things.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "871",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A short story should be long in depth and should give us an experience of meaning.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "882",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "When you write a story, you only have to write one story, but there will always be people who will refuse to read the story you have written.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "890",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Meaning is what keeps the short story from being short.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "898",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The meaning of fiction is not abstract meaning but experienced meaning, and the purpose of making statements about the meaning of a story is only to help you to experience that meaning more fully.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "905",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Fiction is an art that calls for the strictest attention to the real—whether the writer is writing a naturalistic story or a fantasy.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "906",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The peculiar problem of the short-story writer is how to make the action he describes reveal as much of the mystery of existence as possible. He has only a short space to do it in and he can’t do it by statement. He has to do it by showing, not by saying, and by showing the concrete—so that his problem is really how to make the concrete work double time for him.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "921",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It is a fact that fiction writing is something in which the whole personality takes part—the conscious as well as the unconscious mind.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "948",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "I think it is a way of looking at the created world and of using the senses so as to make them find as much meaning as possible in things.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "952",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The only way, I think, to learn to write short stories is to write them, and then to try to discover what you have done.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "960",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "One is the sense of mystery and the other is the sense of manners. You get the manners from the texture of existence that surrounds you.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "973",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "An idiom characterizes a society, and when you ignore the idiom, you are very likely ignoring the whole social fabric that could make a meaningful character.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "982",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "In most good stories it is the character’s personality that creates the action of the story.",
    "note": "",
    "source_title": "Mystery and Manners",
    "source_author": "Flannery O'Connor",
    "locator_type": "Location",
    "locator": "995",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "When you’re actually writing or reading, “plot” and “character” and “theme” and “structure” aren’t discrete entities but interweave and inform each other.",
    "note": "",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "55",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The door that opens when all others close is sometimes the path to genius.",
    "note": "",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "145",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "To me, a twist ending in a short-short shoots the rest of the story in the head. When there’s a twist ending the story tends to draw all the focus to the twist, an ending that’s maybe kind of funny, and so all the rest of it really didn’t matter, you were just killing time until you could get to that ending. You were sacrificing substance (which is to say, theme) for simplistic plot and a punch line. My",
    "note": "theme",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "439",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "So I think it’s probably safe to say that theme generally exists before the story is written, whether the author knows it or not.",
    "note": "theme",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "603",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "don’t know how safe it is, but that makes a weird kind of sense.",
    "note": "theme",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "605",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Short sentences (using concrete words and active voice), action sequences, cliffhanger breaks, stripped-down dialogue, and abbreviated scenes and chapters will all speed up a story.",
    "note": "technique pace",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "812",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Long and complicated sentences (using abstractions and “meditative” content), elaborate descriptive passages, flashbacks, extended discussions between characters, and lengthy scenes and chapters will slow a story down.",
    "note": "technique pace",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "813",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "James Scott Bell lists nine different types of cliffhanger endings in his book Plot & Structure. Some of these are major cliffhangers involving disasters and high emotion. Others are the smaller sort of hooks appropriate to the end of a chapter which simply encourage the reader to keep on reading. A portentous detail or a snippet of mysterious dialogue, for example, may encourage readers to begin the next chapter simply for an explanation.",
    "note": "technique cliffhangers",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "840",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Surprises, revealed secrets, and posed questions are somewhat bolder cliffhangers, effective if you don’t use too many of them. Sometimes ending a chapter with the setup of an incomplete everyday action such as opening a door or beginning a sentence or starting a conversation can create sufficient tension that will make readers read on simply to complete that action.",
    "note": "techniqie cliffhangers",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "843",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Examples of these small reveals include (but are not limited to): discovery of the weapon, finding a key witness, receiving the forensics report, stumbling across new physical evidence, learning of a possible motive, researching a similar crime, capitalizing on a perpetrator’s mistake, figuring out the timeline, uncovering a secret relationship, witnessing an inconsistent behavior, noticing a pattern.",
    "note": "technique reveal",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "853",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Ann Patchett’s novels—notable among them Bel Canto, State of Wonder, Run—are wonderful examples of omniscient POV that also gives the reader intimate connection with the interior world of each individual character. I study her technique and recommend it to other writers; it’s a real tour de force.",
    "note": "recommendation",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "927",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "STEVE: Because of the rarity, it’s worth pointing out some examples. Well known novels in second-person include William Faulkner’s Absalom Absalom, Italo Calvino’s If on a Winter’s Night a Traveler, Jay McInerney’s Bright Lights, Big City, Jeff VanderMeer’s Veniss Underground, Stewart O’Nan’s A Prayer for the Dying, Chuck Palahniuk’s Fight Club, Carlos Fuentes’s Aura, and Iain Banks’s Complicity.",
    "note": "pov second person",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,128",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "In Lorrie Moore’s collection Self-Help, six of the nine stories are told in second person. Other short stories that use second-person are “Poor Little Warrior!” by Brian Aldiss, “You Need to go Upstairs” by Rumer Godden, “Elegy for a Freelance” by Angela Carter, “Tell Me Yes or No” by Alice Munro, “Graffiti” by Julio Cortazar, “Happy Endings” by Margaret Atwood, “Foot Work” by Chuck Palahniuk, and my own “Shadow” and “2 PM: The Real Estate Agent Arrives” (the latter is the opening story of my collection Ugly Behavior.)",
    "note": "pov second person",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,133",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Point of view is the armature, and then you overlay that with what the voice is. So POV determines voice, but there’s more to voice than POV. That may not be a textbook definition, but it’s a working definition.",
    "note": "pov and voice",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,265",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Then I’ll do a minimal amount of research related to the theme and I write that down as well. Inevitably I’ll write down something that sounds like a bit of dialog or a snippet of someone’s thoughts and I start wondering who would say or think such a thing? Who is this character? So for a time I focus on writing down more things in the same vein, in the same tone, that same person might think or say until I begin getting some glimpses of the setting they’re in. Maybe it’s indoors or outdoors, maybe there are other people or significant objects with them. I’m slowly beginning to inhabit this unknown character, and they’re beginning to tell me who they are and what they’re about. I’m assuming during this process that whatever they see, wherever they are, is specific to them and their experience in the world. These things characterize them. They mirror certain internal states of the character. So this feedback process begins to develop where the landscape and the developing tone of the language tells me more about who this viewpoint character is. I begin to understand what things and events will exist in his or her universe. Much of my process at this point in the story becomes one of collecting more and more of these “mirroring” elements—items in the landscape, including other characters, which mirror various aspects of my viewpoint character. Eventually I arrive at the emotional heart of whatever it is I’m writing—the nexus which lets me know what the viewpoint character’s attitude is toward the theme, what his or her “problem” is. Generally, that tells me what the story is really about, and at that point I can begin my first real revisions, bringing everything in the story in line with that emotional thread. I know it sounds terribly inefficient, but I find that the efficiencies gained by having the plot and setting and character reflect one another tend to make up for it.",
    "note": "technique vgood way to start",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,365",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "You put the theme into your subconscious and let it stay there while consciously you’re writing the story with its characters and plot. The subconscious theme percolates through and informs or colors the narrative and the characters.",
    "note": "theme technique",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,420",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They’d been on the trail since before dawn. That addicting composite of fatigue and exhilaration and seldom-admitted boredom had been setting in. The three faster hikers were no longer even trying to stay with the group; every now and then a voice would drift back that might be one of theirs or might be the call of an evening bird. Shadows were long and lovely. She saw gleams in the brush and hoped they were the eyes of cats or bears. Note how the past-perfect tense that signals we’re in a flashback changes to simple past with the third sentence.",
    "note": "technique flashback",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,656",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "STEVE: I’d like to repeat the point that structure is inevitable. No matter what you do, there will be a beginning, middle, and an end. The first word is the beginning, the last word is the end, and there are words in the middle.",
    "note": "structure",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,663",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "George Orwell’s 1984 begins “It was a bright cold day in April, and the clocks were striking thirteen.”",
    "note": "beginnings",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,699",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "STEVE: And there’s the rub. If you don’t start, you’ll never finish. If you don’t write, you’ll never be a writer. All the planning and preparation and thinking about finding the perfect opening, middle, and end mean nothing if nothing gets written.",
    "note": "wtiters write",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,746",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Use any kind of beginning you like, as long as you can make it interesting.",
    "note": "beginnings",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,829",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "MELANIE: A beginning has several jobs: • launching the story • setting the tone • establishing the setting • introducing the viewpoint • pulling the reader in • taking the narrative into the middle",
    "note": "beginnings",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,851",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Stations of the Cross • cards in a deck (Tarot or Poker) • ingredients in a recipe • rooms in a house • houses in a neighborhood • travel directions • the first lines in a collection of poems • the first sentence of each paragraph in a document • collections: aspects, colors, objects, instructions",
    "note": "structure techniques",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "1,909",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "an ending that begins “many years later” • a statement of a certain hope, or of inertia (sometimes both at the same time) • a description of a transformation • a debunking of various false tales told about what “really” happened • a description of how a character’s beliefs changed • a final statement of feeling • a statement that the character is going to change direction or do something else • a statement that the character now “understands completely” • a sudden change in focus—pulled back or pushed even closer • a realization that the character can’t do one thing, but can do another • a description of a work of art and an interpretation of what it means in relationship to the story",
    "note": "techniques endings",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,001",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "But I would say as a general rule the best way to be universal is to be quite close, detailed, and specific.",
    "note": ".",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,033",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "At its simplest level, subtext is what is unspoken in a story, implied by the characters or the author but not told directly.",
    "note": "",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,127",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "STEVE: In order to participate in that process, the reader has to suspend disbelief. That phrase is commonly used about speculative fiction, where the writer asks the reader to accept a “reality” inhabited by, say, extraterrestrial beings or fairies or werewolves. But when you come right down to it, all fiction depends on the reader entering into a reality that doesn’t literally exist. Note | Location: 2,237 essence of writing",
    "note": "",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,234",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Another method of engaging the reader, related to those we’ve already touched on, is close observation and use of specifics.",
    "note": "",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,318",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Use of general emotional descriptors is another form of insufficient imagining that distances the reader. Rather than saying “Rage filled him,” imagine what it’s like for him to be enraged or, if you’re not writing from his point of view, for someone else to observe his rage. Give us his flush, the buzzing or roaring in his head, his stance, whether he shouts or his voice becomes quiet and cold or he falls ominously silent. Better",
    "note": "showing",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,320",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "general, it’s useful to regard any “feeling” word as a clue that you haven’t fully imagined your character, setting, and plot. This is especially true about “big feeling” words—“rage,” “horror,” “bliss,” “passion,” “sorrow,”",
    "note": "showing",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,329",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "An example of a misplaced modifying phrase would be: “Remembering the back yard of the house where he grew up, the trees here made him nostalgic.” In this construction, the phrase before the comma modifies the noun that is the subject of the sentence, “trees,” so it reads as if the trees are remembering. One way to correct it would be: “Seeing the trees here brought back memories of his childhood back yard,” which fixes the error and also eliminates the telling-instead-of-showing “made him feel nostalgic.” Or, even better, you could avoid the whole issue, tighten the prose, and be more detailed: “The trees in his childhood back yard had been like this, spindly and bowed.” Here we have an illustration of how fixing one problem in a manuscript will often fix several. I love when that happens.",
    "note": "technique grammar",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,499",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Theme: The purpose of the story, what it’s about—the very fact that it’s about something—can create interest in reading it. • Compelling characters: Remember, the reader doesn’t have to like or identify with the character, only to be interested. • Showing rather than telling: Leaving spaces for the reader to participate in the creative process, rather than laying everything out, requires relinquishment of some authorial control and can lead to egregious misinterpretations, but generally I’m delighted when a reader finds something in my work I hadn’t consciously intended and didn’t even realize was there. • Pacing, the reveal, and the trinity of beginning, middle, and end—all in some sense aspects of plot—supply the energy of the story and drive the reader’s interest in finding out what happens.",
    "note": "technique summary",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,525",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Debates grew animated (and lengthy) about the merits of one verb over another, and I pushed for proponents to give their reasons for supporting their candidates. Modifiers (especially adverbs, for some reason) were attacked and (less often) defended, and I asked for justifications. We worked as a (God help us) committee to find ways the writer could have said the same thing in fewer, stronger words. We ferreted out lapses in voice, inconsistencies in point of view, plot problems, info dumps, misplaced modifying phrases, misuse of subjunctive. I got to indulge my OCD about phrases like “it rose up” (could it rise down?), “she thought to herself” (unless it’s a science fiction story, she’s probably not thinking to anybody else), “he shrugged his shoulders and nodded his head” (what else would he shrug and nod?), “I knelt down” (as opposed to kneeling up, perhaps?). Particularly felicitous aspects of the piece were singled out for admiration, and we pinpointed why they worked so well. There were lively discussions about when rewriting gives life and spirit to a piece, making it leap off the page, and when it saps the life and spirit and leaves the piece like roadkill on the page.",
    "note": "class activity",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,581",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Common weedy words Gene probably had in mind are adverbs like “very,” “extremely,” and “certainly.” Almost always you can find a stronger way to say what you mean with a single word rather than a two- or three-word phrase with an adverb in it.",
    "note": "technique editing",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,603",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Just by keeping in mind the principles of basic good writing during the revision process, you’ll usually end up with fewer words. Showing rather than telling, fully imagining characters who speak for themselves, leaving spaces for the reader to participate in the imaginative process rather than giving it all to them—these principles have the fortuitous side effect of tightening the prose.",
    "note": "editing",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,640",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "supportive, honest, and specific.",
    "note": "classes",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,669",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "That’s the core conflict of the creative process, I think–learning the rules and conventions so you can use them as tools without smothering that inspirational spark. Nurturing the inspiration by use of the tools, rather than stifling it with them.",
    "note": "class discussion",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "2,988",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The point is the importance of making your writing time regular and placing high value on it. If you wait for “found time,” it’s much less likely to happen, because other things will take priority. writers write",
    "note": "",
    "source_title": "Yours to Tell: Dialogues on the Art & Practice of Writing",
    "source_author": "Steve Rasnic Tem;Melanie Tem",
    "locator_type": "Location",
    "locator": "3,300",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Get used to the bad temperaments of those you deal with, like getting used to ugly faces. This is advisable in situations of dependency. There are horrible people you can neither live with nor live without. It’s a necessary skill, therefore, to get used to them, as to ugliness, so you’re not surprised each time their harshness manifests itself. At first they’ll frighten you, but gradually your initial horror will disappear and caution will anticipate or tolerate the unpleasantness.. File Size: 637 KB Print Length: 60 pages Page Numbers Source ISBN: B01BITMTNW Publisher: Penguin Classics; 01 edition (February 26, 2015) Publication Date: February 26, 2015 Language: English ASIN: B00R730F2G",
    "note": "",
    "source_title": "How to Use Your Enemies (Penguin Little Black Classics)",
    "source_author": "Baltasar Gracián",
    "locator_type": "Location",
    "locator": "256",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Blind luck, to arrive in the world with your properly formed parts in the right place, to be born to parents who were loving, not cruel, or to escape, by geographical or social accident, war or poverty. And therefore to find it so much easier to be virtuous.",
    "note": "profound",
    "source_title": "The Children Act",
    "source_author": "Ian McEwan",
    "locator_type": "Page",
    "locator": "31",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "otiose",
    "note": "",
    "source_title": "The Children Act",
    "source_author": "Ian McEwan",
    "locator_type": "Page",
    "locator": "89",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "was a long thin face, ghoulishly pale, but beautiful, with crescents of bruised purple fading delicately to white under the eyes, and full lips that appeared purplish too in the intense light. The eyes themselves looked violet and were huge. There was a mole high on one cheek, as artificial-looking as a painted beauty spot. His build was frail, his arms protruded like poles from the hospital gown. He spoke breathlessly, earnestly, and in those first",
    "note": "good character description",
    "source_title": "The Children Act",
    "source_author": "Ian McEwan",
    "locator_type": "Page",
    "locator": "103",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The car she reclined in was a 1960s Bentley, her destination, Leadman Hall, set a mile inside its park, which she was entering now by the lodge-house gates. Soon she passed a cricket ground, then an avenue of beeches, already agitating in a strengthening breeze, then a lake choked with greenery. The hall, in the Palladian style, recently painted a too brilliant white, had twelve bedrooms and nine staff to accommodate and serve two High Court judges on circuit. Pevsner had mildly approved of the orangery, and nothing else.",
    "note": "greatconcised dedscription",
    "source_title": "The Children Act",
    "source_author": "Ian McEwan",
    "locator_type": "Page",
    "locator": "153",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Another evasion, to ask how rather than why, but at this stage, while his presence was still a shock, she couldn’t face knowing what he wanted from her.",
    "note": "nice technique",
    "source_title": "The Children Act",
    "source_author": "Ian McEwan",
    "locator_type": "Page",
    "locator": "162",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The silence wound itself around them and bound them.",
    "note": "good",
    "source_title": "The Children Act",
    "source_author": "Ian McEwan",
    "locator_type": "Page",
    "locator": "172",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She was beyond speech and the crying would not stop and she could not bear any longer to be seen. She stooped to gather up her shoes and hurried across the room in her stockinged feet and along the hallway. The further away from him she was, the louder she cried. She reached her bedroom, slammed the door behind her and, without turning on the light, fell onto the bed and sank her face into a pillow. good",
    "note": "",
    "source_title": "The Children Act",
    "source_author": "Ian McEwan",
    "locator_type": "Page",
    "locator": "218",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "I’d wondered if the seasons would ever be new again, brand-new time, rather than just seem to be following each other nose to tail like paint-peeling wooden horses on an old carousel.",
    "note": "good metaphor",
    "source_title": "Artful",
    "source_author": "Ali Smith",
    "locator_type": "Page",
    "locator": "3",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "She was already loosened like long hair, poured out like fallen rain, shared like a limitless supply. She was already root. Eurydice is over the edge; she has changed worlds. Sylvia Plath, in her poem Edge, one clearly heavily influenced by Rilke’s Eurydice, is interested not just in ends and endings but in a continuing aesthetic tradition of finishings and of tragic completion.",
    "note": "fremeber about edges. liminal states",
    "source_title": "Artful",
    "source_author": "Ali Smith",
    "locator_type": "Page",
    "locator": "137",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "But if we may perish by cracks in things that we don’t know –!” And she smiled with the sadness of it. “We can never then give each other anything.”’",
    "note": "profound",
    "source_title": "Artful",
    "source_author": "Ali Smith",
    "locator_type": "Page",
    "locator": "165",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Art is always an exchange, like love, whose giving and taking can be a complex and wounding matter, according to Michelangelo in this love sonnet (translated by Christopher Ryan): ‘Within the sweetness of an immense kindness there often lurks concealed some offence to one’s honour and one’s life; … Anyone who gives wings to another’s shoulders, and then along the way gradually spreads out a hidden net, extinguishes completely the ardent charity enkindled by love precisely where it most desires to burn.’",
    "note": "giving",
    "source_title": "Artful",
    "source_author": "Ali Smith",
    "locator_type": "Page",
    "locator": "166",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It’s possible that the gift of wings, one way or another, always involves the net Michelangelo warned us of.",
    "note": "giving",
    "source_title": "Artful",
    "source_author": "Ali Smith",
    "locator_type": "Page",
    "locator": "172",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "‘O wad some Pow’r the giftie gie us / To see oursels as others see us!’",
    "note": "giving",
    "source_title": "Artful",
    "source_author": "Ali Smith",
    "locator_type": "Page",
    "locator": "177",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Here’s a story from Oscar Wilde about what happens when reflection is at its most narcissistic: When Narcissus died, the flowers of the field were desolate and asked the river for some drops of water to weep for him. ‘Oh!’ answered the river, ‘if all my drops of water were tears, I should not have enough to weep for Narcissus myself. I love him.’ ‘Oh!’ replied the flowers of the field, ‘how could you not have loved Narcissus? He was beautiful.’ ‘Was he beautiful?’ said the river. ‘And who should know better than you? Each day, leaning over your bank, he beheld his beauty in your waters.’ ‘If I loved him,’ replied the river, ‘it was because, when he leaned over my waters, I saw the reflection of my waters in his eyes.’",
    "note": "narcissus",
    "source_title": "Artful",
    "source_author": "Ali Smith",
    "locator_type": "Page",
    "locator": "190",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Here’s to what David Constantine said in his work on why the arts matter: ‘no society that I know of has done without poetry, which must mean it can’t be done away with (some have tried) or done without.’ arts",
    "note": "",
    "source_title": "Artful",
    "source_author": "Ali Smith",
    "locator_type": "Page",
    "locator": "196",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "They shivered the cathedral silence of winter into a million rattling fragments.",
    "note": "",
    "source_title": "The Shining",
    "source_author": "Stephen King",
    "locator_type": "Page",
    "locator": "276",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "‘I write to preserve something I’ve thought/felt/seen’.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "88",
    "highlight_color": "Orange",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Traveling through the Dark Traveling through the dark I found a deer dead on the edge of the Wilson River road. It is usually best to roll them into the canyon: that road is narrow; to swerve might make more dead. By glow of the tail-light I stumbled back of the car and stood by the heap, a doe, a recent killing; she had stiffened already, almost cold. I dragged her off; she was large in the belly. My fingers touching her side brought me the reason – her side was warm; her fawn lay there waiting, alive, still, never to be born. Beside that mountain road I hesitated. The car aimed its lowered parking lights; under the hood purred the steady engine. I stood in the glare of the warm exhaust turning red; around our group I could hear the wilderness listen. I thought hard for us all – my only swerving – then pushed her over the edge into the river.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "404",
    "highlight_color": "Orange",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Form is ‘expectation satisfied’",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "543",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "poetry – if it is to be authentic – has to try and capture something of the spirit of the age;",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "581",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "they fail if they are obvious. Worn-out technique (such as inversion of word order to eke out a metrical norm or close a rhyme),",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "585",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "‘No ideas but in things’ Williams said.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "629",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Ezra Pound in 1910 put paid to Dr Johnson’s generalisations with one of his own: ‘The artist selects and presents the luminous detail. He does not comment.’",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "655",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "‘Tradition may not be a continuum, and yet it embodies a kind of progression. It is possible to allude to things in it, to take things from it, but to go back is not allowed,’",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "660",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "W.H. Auden apparently defined poetry as ‘memorable speech’.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "678",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "All bad literature aspires to the condition of literature. All good literature aspires to the condition of life.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "689",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "it’s just as easy to call a poem something interesting as it is to call it something dull.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "693",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "‘Writing poetry is more than anything else an attitude of mind’",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "904",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "creative process as taking four stages: Preparation; Incubation; Illumination; Verification.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,019",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Art is the habit of the artist; and habits have to be rooted deep in the whole personality. They have to be cultivated like any other habit, over a long period of time, by experience; and teaching any kind of writing is largely a matter of helping the student develop the habit of art.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,067",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "called the",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,085",
    "highlight_color": "Orange",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "The best way I’ve found is to begin each workshop session with ‘this week’s poet’: two",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,127",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "or three poems in photocopy handed round, read out a couple of times and then discussed in some detail.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,127",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "FREE WRITING",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,150",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "The Bloody Machine Gun.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,171",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Whispers.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,174",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "HANDS.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,178",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "Thom Gunn’s ‘The Feel of Hands’ (Selected Poems).",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,183",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "VIEW FROM A WINDOW.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,185",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "INTENSIVE WRITING.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,187",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "Postcards.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,210",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "Guided Fantasy.",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,242",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "Paul Hyland’s Getting into Poetry (Bloodaxe), exploded notes | Location: 88 Options ‘I write to preserve something I’ve thought/felt/seen’. Orange | Location: 404 Options Traveling through the Dark Traveling through the dark I found a deer dead on the edge of the Wilson River road. It is usually best to roll them into the canyon: that road is narrow; to swerve might make more dead. By glow of the tail-light I stumbled back of the car and stood by the heap, a doe, a recent killing; she had stiffened already, almost cold. I dragged her off; she was large in the belly. My fingers touching her side brought me the reason – her side was warm; her fawn lay there waiting, alive, still, never to be born. Beside that mountain road I hesitated. The car aimed its lowered parking lights; under the hood purred the steady engine. I stood in the glare of the warm exhaust turning red; around our group I could hear the wilderness listen. I thought hard for us all – my only swerving – then pushed her over the edge into the river. Yellow | Location: 543 Options Form is ‘expectation satisfied’ Yellow | Location: 581 Options poetry – if it is to be authentic – has to try and capture something of the spirit of the age; Yellow | Location: 585 Options they fail if they are obvious. Worn-out technique (such as inversion of word order to eke out a metrical norm or close a rhyme), Yellow | Location: 629 Options ‘No ideas but in things’ Williams said. Yellow | Location: 655 Options Ezra Pound in 1910 put paid to Dr Johnson’s generalisations with one of his own: ‘The artist selects and presents the luminous detail. He does not comment.’ Yellow | Location: 660 Options ‘Tradition may not be a continuum, and yet it embodies a kind of progression. It is possible to allude to things in it, to take things from it, but to go back is not allowed,’ Yellow | Location: 678 Options W.H. Auden apparently defined poetry as ‘memorable speech’. Yellow | Location: 689 Options All bad literature aspires to the condition of literature. All good literature aspires to the condition of life. Yellow | Location: 693 Options it’s just as easy to call a poem something interesting as it is to call it something dull. Yellow | Location: 904 Options ‘Writing poetry is more than anything else an attitude of mind’ Yellow | Location: 1,019 Options creative process as taking four stages: Preparation; Incubation; Illumination; Verification. Yellow | Location: 1,067 Options Art is the habit of the artist; and habits have to be rooted deep in the whole personality. They have to be cultivated like any other habit, over a long period of time, by experience; and teaching any kind of writing is largely a matter of helping the student develop the habit of art. | Location: 1,127 Options The best way I’ve found is to begin each workshop session with ‘this week’s poet’: two or three poems in photocopy handed round, read out a couple of times and then discussed in some detail. | Location: 1,150 Options FREE WRITING Yellow | Location: 1,171 Options The Bloody Machine Gun. Yellow | Location: 1,174 Options Whispers. Yellow | Location: 1,178 Options HANDS. Yellow | Location: 1,183 Options Thom Gunn’s ‘The Feel of Hands’ (Selected Poems). Yellow | Location: 1,185 Options VIEW FROM A WINDOW. Yellow | Location: 1,187 Options INTENSIVE WRITING. Yellow | Location: 1,210 Options Postcards. Yellow | Location: 1,242 Options Guided Fantasy. Yellow | Location: 1,923 Options Paul Hyland’s Getting into Poetry (Bloodaxe),",
    "note": "",
    "source_title": "Writing Poems: 2 (Crowood Gardening Guides)",
    "source_author": "Peter Sansom",
    "locator_type": "Location",
    "locator": "1,923",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "There are three kinds of death: physical, professional, psychological.",
    "note": "plot",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "8",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Psychological death is crucial to understand, as it elevates the emotions of fiction like no other aspect.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "10",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Psychological death is the key to all romances, isn't it? If the two lovers don't get together, they will each miss out on their \"soul mate.\" Their lives will be incurably damaged. Since readers of traditional romances know they're going to end up together, it's all the more important to create this illusion of imminent psychological death.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "10",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Know your death stakes! This is going to be crucial in order for you to write your novel from the middle.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "11",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The timing of the first pillar should be before the 1/5 mark of your book.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "18",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The second act is a series of actions where the character confronts and resists death and is opposed by counter forces.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "19",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "In a character-driven story, he looks at himself and wonders what kind of person he is. What is he becoming?",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "22",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The second type of look is more for plot-driven fiction. It's where the character looks at himself and considers the odds against him. At this point the forces seem so vast that there is virtually no way to go on and not face certain death. That death can be physical, professional, or psychological.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "23",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "But what I detect is a character point, something internal, which has the added benefit of bonding audience and character on a deeper level.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "26",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Once you know what the moment is, you can truly write from the middle. Because now you know what sort of transformation happens at the end, and what the character's psychological state was at the beginning, in the pre-story world.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "29",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Change does involve an inner realization. But then, to prove itself, it must work outward in a visual form.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "37",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Does it seem like she's got a moral flaw as she looks in the mirror? Or does it seem like she's looking at the incredible odds against her?",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "46",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Create more backstory, more secrets, more complexity, and you'll get excited again.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "67",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Take a break when it's drudgery,",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "67",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "(writeordie.ocm).",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "67",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "One of the best \"show\" novels ever written is the classic detective tale The Maltese Falcon by Dashiell Hammett.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "70",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The novel is Big Red's Daughter. It's a 1953 Gold Medal paperback original.",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "75",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A decent guy just trying to find his place in the world",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "76",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The trouble starts on page one",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "76",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Unpredictability",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "77",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "A nasty but charming bad guy",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "78",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Sympathy for the bad guy",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "78",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A no-speedbump style",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "81",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Honor",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "83",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "A resonant ending",
    "note": "",
    "source_title": "Write Your Novel From The Middle: A New Approach for Plotters, Pantsers and Everyone in Between",
    "source_author": "James Scott Bell",
    "locator_type": "Page",
    "locator": "83",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import",
      "vocabulary"
    ]
  },
  {
    "text": "For the writer, in other words, a childlike receptiveness to experience (however ‘little’) is vital.",
    "note": "",
    "source_title": "The Art of Writing Fiction",
    "source_author": "Andrew Cowan",
    "locator_type": "Page",
    "locator": "68",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "young women who mistake People magazine for news and a Japanese symbol on their backs for a sign of rebellion.",
    "note": "From I am Pilgrim - some great observations",
    "source_title": "I Am Pilgrim",
    "source_author": "Terry Hayes",
    "locator_type": "Page",
    "locator": "11",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "(contains a biography of the author and an active table of contents) James Joyce Last annotated on Sunday February 9, 2014",
    "note": "",
    "source_title": "Ulysses",
    "source_author": "James Joyce",
    "locator_type": null,
    "locator": null,
    "highlight_color": null,
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "We will sternly refuse to partake of strong waters, will we not? Yes, we will not. By no manner of means.",
    "note": "",
    "source_title": "Ulysses",
    "source_author": "James Joyce",
    "locator_type": "Location",
    "locator": "2,970",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "K.m.a. — Will you tell him he can kiss my arse?",
    "note": "",
    "source_title": "Ulysses",
    "source_author": "James Joyce",
    "locator_type": "Location",
    "locator": "3,026",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "K.m.r.i.a. — He can kiss my royal Irish arse,",
    "note": "",
    "source_title": "Ulysses",
    "source_author": "James Joyce",
    "locator_type": "Location",
    "locator": "3,033",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "O, don’t be talking! she said. He’s a caution to rattlesnakes.",
    "note": "",
    "source_title": "Ulysses",
    "source_author": "James Joyce",
    "locator_type": "Location",
    "locator": "3,221",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Hard time she must have with him.",
    "note": "",
    "source_title": "Ulysses",
    "source_author": "James Joyce",
    "locator_type": "Location",
    "locator": "3,280",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "I create a text file/note card for each scene in the story. For every scene, I try to figure out the following: My main character’s goal, the obstacles in her way (and whom they come from), what she does to battle the obstacles, if she wins or loses (usually loses), and what’s at stake/what happens if (when) she loses. I’ll also throw in notes about where the scene takes place, who’s in it, what their goals and obstacles are (although I don’t usually detail those as strongly), and anything else that pops into my head as I plot. I try not to start a draft until I’ve gone through every scene.",
    "note": "",
    "source_title": "Outlining Your Novel: Map Your Way to Success (Helping Writers Become Authors Book 1)",
    "source_author": "K.M. Weiland",
    "locator_type": "Page",
    "locator": "28",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Promise of conflict. Example: The hero has just been challenged to a duel. Inherent Question: Will he survive? A secret kept. Example: The hero’s partner hides a letter. Inherent Question: What’s in the confounded letter? A major decision or vow. Example: The hero swears to avenge his wife’s murder. Inherent Question: How will he go about it? Will he succeed? An announcement of a shocking event. Example: The hero’s father dies. Inherent Question: How did he die? How is the hero going to react? A moment of high emotion. Example: The hero is enraged by the promotion of an incompetent coworker. Inherent Question: How will the hero express his anger? Will he experience repercussions? A reversal or surprise that turns the story upside down. Example: The heroine discovers her long-dead mother isn’t dead at all. Inherent Question: Where has the mother been all this time? How is the heroine going to adjust to this new paradigm? A new idea. Example: The hero comes up with a new scheme for defeating the bad guy. Inherent Question: Will it work? An unanswered question. Example: “You’re not who you said you were, are you?” Inherent Question: Is he who he said he was? If not, who is he? And why did he lie about his identity? A mysterious line of dialogue. Example: “You’ll find your answers on the Northside Bridge, midnight. Come alone.” Inherent Question: What are the answers? Why the North-side Bridge? Why midnight? Why alone? A portentous metaphor. Example: A solar eclipse over a battlefield. Inherent Question: Is this an indication of tragedy to come? A turning point. Example: The heroine is shipped off to an orphanage. Inherent Question: What will happen in her new life? How will she adapt? Use a wide variety",
    "note": "",
    "source_title": "Outlining Your Novel: Map Your Way to Success (Helping Writers Become Authors Book 1)",
    "source_author": "K.M. Weiland",
    "locator_type": "Page",
    "locator": "166",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He wanted to stay, talking to Maureen, but the silence and the distance, which they had nursed for twenty years, had grown to such a point that even clichés were empty and they hurt.",
    "note": "Nick this",
    "source_title": "The Unlikely Pilgrimage Of Harold Fry",
    "source_author": "Rachel Joyce",
    "locator_type": "Page",
    "locator": "121",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "It was hard to understand a little and then walk away.",
    "note": "Insightful comment",
    "source_title": "The Unlikely Pilgrimage Of Harold Fry",
    "source_author": "Rachel Joyce",
    "locator_type": "Page",
    "locator": "145",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Harold could no longer pass a stranger without acknowledging the truth that everyone was the same, and also unique; and that this was the dilemma of being human.",
    "note": "",
    "source_title": "The Unlikely Pilgrimage Of Harold Fry",
    "source_author": "Rachel Joyce",
    "locator_type": "Page",
    "locator": "158",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "There were times, he saw, when not knowing was the biggest truth, and you had to stay with that.",
    "note": "",
    "source_title": "The Unlikely Pilgrimage Of Harold Fry",
    "source_author": "Rachel Joyce",
    "locator_type": "Page",
    "locator": "234",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "He wished the man would honour the true meaning of words, instead of using them as ammunition.",
    "note": "",
    "source_title": "The Unlikely Pilgrimage Of Harold Fry",
    "source_author": "Rachel Joyce",
    "locator_type": "Page",
    "locator": "235",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "I’m the kind of man who thanks the talking clock. Nick",
    "note": "",
    "source_title": "The Unlikely Pilgrimage Of Harold Fry",
    "source_author": "Rachel Joyce",
    "locator_type": "Page",
    "locator": "308",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "First, we must erase all direct addresses to the reader,",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "450",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "eliminate all such explicit judgments,",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "459",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "the author’s presence will be obvious on every occasion when he moves into or out of a character’s mind—when",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "459",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "why not go the next step and object to all inside views, not simply those that require a shift in point of view.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "467",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Wherever they are placed, they will call attention to the author’s selecting presence,",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "497",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "As we begin now to deal with this question, we must never forget that though the author can to some extent choose his disguises, he can never choose to disappear.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "512",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The persistent enemy for James was intellectual and artistic sloth, not any particular way of telling or showing a story.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "537",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The novel began, we are told, with Cervantes, with Defoe, with Fielding, with Richardson, with Jane Austen—or was it with Homer? It was killed by Joyce, by Proust, by the rise of symbolism, by the loss of",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "761",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "respect for—or was it the excessive absorption with?—hard facts. No, no, it still lives, but only in the work of.... Thus, on and on. Occasionally,",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "762",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "James began at a different place entirely, with the effort to portray a convincing mind at work on reality.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "867",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "he was disturbed by Flaubert’s choice of stupid minds as centers of consciousness “reflecting” events.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "869",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Indeed, there can be no illusion of life where there is no bewilderment (p. 66),",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "914",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The novelist must be either inside or out. Because M. Mauriac does not observe these laws, he does away with his characters’ minds.”42",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "999",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Jean-Louis Curtis says in his brilliant reply to Sartre,45 on a tacit contract with the novelist, a contract granting him the right to know what he is writing about.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "1,031",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "“If you destroy the notion of choice it is art that is annihilated.”",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "1,034",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "the author’s voice is never really silenced. It is, in fact, one of the things we read fiction for (chap. vii), and we are never troubled by it unless the author makes a great to-do about his own superior naturalness.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "1,151",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "A great artist can create an implied author who is either detached or involved, depending on the needs of the work in hand.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "1,507",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The emotions and judgments of the implied author are, as I hope to show, the very stuff out of which great fiction is made.27",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "1,563",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "“You must have your eyes forever on your Reader. That alone constitutes Technique!” —FORD MADOX FORD",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "1,570",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "1. Even if a presented object seems to the author to call for a natural response based on universals, he can never count on those universals being responded to with any intensity unless he gives good reasons.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "1,922",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "Men in general will never cease to care about the two values of filial piety and respect for the dead, pitted against “flood and fire”—so long as there are readers who care for literature at all.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "1,945",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The meaningless accumulation of accurately observed detail cannot satisfy us for long; only if the details are made to tell, only if they are weighted with a significance for the lives shown, will they be tolerable.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "1,986",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "But, on the other hand, if he assumes that his author is choosing details consciously and packing them with significance, he may find himself overinterpreting.",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "1,993",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "he creates a kind of humanity,",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "2,030",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "His business is with these enduring intuitions which have the power to recognize occasions of suffering or occasions of happiness, in spite of all distortion and blearing.”",
    "note": "",
    "source_title": "The Rhetoric of Fiction",
    "source_author": "Wayne C. Booth",
    "locator_type": "Location",
    "locator": "2,031",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "all really strong-minded women, on whom everybody flops, she adored being bossed about. It was so restful.",
    "note": "",
    "source_title": "Cold Comfort Farm",
    "source_author": "Stella Gibbons",
    "locator_type": "Location",
    "locator": "4,487",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "crapulous themselves, and it was good to spend time with people who’d brought up children of their own, and listened more than they talked, and thought gardening was more important than getting your hair cut. And maybe they were old-fashioned. Maybe Ray was old-fashioned. Maybe he didn’t like hoovering. Maybe he always put the tampon box back into the bathroom cupboard. But Graham did t’ai chi and turned out to be a wanker. She didn’t give a toss what her parents thought. Besides, Mum was shagging one of Dad’s old colleagues, and Dad was pretending the silk scarves and the twinkle were all down to her new job at the bookshop. So they weren’t in a position to lecture anyone when it came to relationships. Jesus, she didn’t even want to think about it. All she wanted was to get through lunch without too much friction and avoid some grisly woman-to-woman chat over the washing-up. 6 Lunch went rather well, right up until dessert. There was a minor hiccup when George was changing out of his work clothes. He was about to remove his shirt and trousers when he remembered what they were hiding, and felt that horror-film lurch you got when the mirrored door of the wardrobe swung shut to reveal the zombie with the scythe standing behind the hero. He turned off the lights, pulled down the blinds and showered in darkness singing ‘Jerusalem’. As a result he walked downstairs feeling not only clean but proud of having taken such rapid and effective action. When he reached the dining room there was wine and conversation and Jacob pretending to be a helicopter and George was finally able to loosen his grip a little. His fear that Jean, being Jean, would make some well-meant but inappropriate comment, that Katie, being Katie, would rise to the bait and that the two of them would proceed to fight like cats proved unfounded. Katie talked about Barcelona (it was in Spain, of course, he remembered now), Ray was complimentary about the food (‘Cracking soup, Mrs Hall’) and Jacob made a runway out of cutlery so his bus could take off and got quite heated when George said that buses did not fly. They were halfway through the blackberry crumble, however, when the lesion began to itch like athlete’s foot. The word tumour came to mind and it",
    "note": "",
    "source_title": "A Spot of Bother",
    "source_author": "Mark Haddon",
    "locator_type": "Page",
    "locator": "15",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "to write he said or she said is divine.",
    "note": "",
    "source_title": "On Writing: A Memoir of the Craft",
    "source_author": "Stephen King",
    "locator_type": "Page",
    "locator": "144",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "readers recognize the people in a book, their behaviors, their surroundings, and their talk.",
    "note": "",
    "source_title": "On Writing: A Memoir of the Craft",
    "source_author": "Stephen King",
    "locator_type": "Page",
    "locator": "184",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "I lean more heavily on intuition,",
    "note": "",
    "source_title": "On Writing: A Memoir of the Craft",
    "source_author": "Stephen King",
    "locator_type": "Page",
    "locator": "189",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "The situation comes first.",
    "note": "",
    "source_title": "On Writing: A Memoir of the Craft",
    "source_author": "Stephen King",
    "locator_type": "Page",
    "locator": "190",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  },
  {
    "text": "(a) everyone has a history and (b) most of it isn’t very interesting. Stick to the parts that are, and don’t get carried away with the rest.",
    "note": "",
    "source_title": "On Writing: A Memoir of the Craft",
    "source_author": "Stephen King",
    "locator_type": "Page",
    "locator": "272",
    "highlight_color": "Yellow",
    "tags": [
      "kindle-import"
    ]
  }
]$kindle_import$::jsonb) as item(
      text text,
      note text,
      source_title text,
      source_author text,
      locator_type text,
      locator text,
      highlight_color text,
      tags jsonb
    )
  ), prepared as (
    select
      target_teacher_id as saved_by,
      text as snippet_text,
      nullif(note, '') as note,
      jsonb_build_object(
        'blockId', md5(source_title || '|' || source_author || '|' || coalesce(locator_type, '') || '|' || coalesce(locator, '') || '|' || text),
        'startOffset', 0,
        'endOffset', char_length(text),
        'quote', text,
        'categoryLabel', 'Uncategorised',
        'categorySlug', 'uncategorised',
        'tags', coalesce(tags, jsonb_build_array('kindle-import')),
        'sourceLabel', source_author,
        'sourceAuthor', source_author,
        'sourceTitle', source_title,
        'sourceName', source_title,
        'sourceKind', 'Kindle clipping',
        'sourceTypeLabel', 'Kindle clipping',
        'sourceSection', concat_ws(': ', locator_type, locator),
        'highlightColor', highlight_color,
        'originalSource', source_title
      ) as anchor
    from imported
  )
  insert into public.snippets (
    saved_by,
    captured_by,
    source_type,
    snippet_text,
    anchor,
    note,
    visibility
  )
  select
    prepared.saved_by,
    prepared.saved_by,
    'external',
    prepared.snippet_text,
    prepared.anchor,
    prepared.note,
    'private'
  from prepared
  where not exists (
    select 1
    from public.snippets existing
    where existing.saved_by = prepared.saved_by
      and existing.source_type = 'external'
      and existing.snippet_text = prepared.snippet_text
      and existing.anchor ->> 'sourceTitle' = prepared.anchor ->> 'sourceTitle'
      and existing.anchor ->> 'sourceAuthor' = prepared.anchor ->> 'sourceAuthor'
  );

  get diagnostics imported_count = row_count;
  raise notice 'Imported % Kindle clipping snippets for teacher profile %.', imported_count, target_teacher_id;
end;
$$;

commit;

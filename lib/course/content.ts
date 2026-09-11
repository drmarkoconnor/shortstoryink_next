export const courseSessions = [
 {slug:'begin-again',title:'Begin again',focus:'Noticing, freewriting and a notebook of possibilities',image:'free-writing',ready:true},
 {slug:'someone-particular',title:'Someone particular',focus:'Character, desire, contradiction and choice',image:'character',ready:true},
 {slug:'somewhere-that-matters',title:'Somewhere that matters',focus:'Location, sensory detail and setting as pressure',image:'location',ready:false},
 {slug:'who-tells-it',title:'Who tells it?',focus:'Viewpoint, distance and voice',image:'voice',ready:false},
 {slug:'make-a-scene',title:'Make a scene',focus:'Action, showing, telling and summary',image:'clarity',ready:false},
 {slug:'what-remains-unsaid',title:'What remains unsaid',focus:'Dialogue, silence and subtext',image:'character',ready:false},
 {slug:'what-happens-next',title:'What happens because of this?',focus:'Openings, consequence and story structure',image:'plot',ready:false},
 {slug:'story-clock',title:'The story’s clock',focus:'Time, memory, compression and pacing',image:'time-in-fiction',ready:false},
 {slug:'images-and-meaning',title:'Images that carry meaning',focus:'Metaphor, motif and concrete detail',image:'metaphors-and-images',ready:false},
 {slug:'leave-the-reader',title:'Where to leave the reader',focus:'Endings, resonance and theme',image:'endings',ready:false},
 {slug:'keep-it-alive',title:'Make it clear; keep it alive',focus:'Precision, rhythm and line editing',image:'editing',ready:false},
 {slug:'return-to-the-story',title:'Return to the story',focus:'Feedback, revision and continuing practice',image:'theme',ready:false},
] as const
export type Lesson = {
 invitation:string; outcome:string; passage:string; source:string; questions:string[];
 observation:string; exercise:string[]; stretch:string; revision:string; reflection:string; companionTitles:string[]
}
export const lessons: Record<string,Lesson> = {
 'begin-again':{
  invitation:'You do not need a story ready in your head. Begin with something you have noticed: an object moved, a familiar sound missing, a small action you cannot quite explain. Rough writing gives you something to discover.',
  outcome:'Find one particular detail in rough writing and use it to begin a small story.',
  passage:'Every Thursday, Mina put two cups beside the kettle. This morning she returned one to the cupboard. Then she took it down again and filled it with the screws from the loose kitchen door. When her brother rang, she carried the cup into the garden to answer him.',
  source:'Original workshop example: “Two cups”, prepared for this course.',
  questions:['Which ordinary action first makes you wonder about Mina’s life?','What changes when the cup holds screws? Find the words that allow more than one interpretation.'],
  observation:'The passage gives us actions before an explanation. The second cup creates a question; its new use changes that question. You may imagine different reasons for Mina’s behaviour. The useful craft move is to let a concrete detail invite the reader’s attention.',
  exercise:['For five minutes, write about an ordinary object in a place you know. Keep moving. If you stall, write “What I also notice is…” and continue. A timer is optional; stopping after a few sentences is fine.', 'Read back without correcting. Underline one detail with energy: something particular, surprising or unresolved. Save it in your notebook or commonplace with a sentence about why it interests you.', 'Give the detail to an imagined person. Write a small beginning, an interruption and a changed action. Aim for roughly 100–200 words if a limit helps; a few sentences are enough.'],
  stretch:'Retell the same small event with a different final action. Notice how the reader’s understanding changes even when most of the words stay the same.',
  revision:'Return to your first version. Replace one general explanation with a detail the reader can see or hear. Keep an explanation if it does useful work; this is an experiment, not a ban on telling.',
  reflection:'Which detail would you like to follow further? Keep it, even if the rest of the exercise goes nowhere.',
  companionTitles:['Are you stuck?','A Practical Stuckness Checklist','What to Do When Stuck in 12 steps'],
 },
 'someone-particular':{
  invitation:'A character can begin as a type, but becomes interesting through particular choices. What do they want in this moment? What makes that difficult? An ordinary, quiet decision can reveal as much as a dramatic confrontation.',
  outcome:'Reveal a character’s desire or contradiction through action, without having to explain their whole history.',
  passage:'At the repair café, Leon laid a spotless radio on the table. “It only needs a wire,” he said. He had brought three different plugs and a tin of biscuits. When the volunteer asked whose radio it was, he straightened the handle. “No hurry,” he said, although he had checked the clock twice.',
  source:'Original workshop example: “The repair café”, prepared for this course.',
  questions:['Where do Leon’s words and actions pull in different directions?','Choose one object or gesture. What does it suggest, and what does the passage leave uncertain?'],
  observation:'“No hurry” sits beside the repeated glance at the clock. That small mismatch makes room for desire, politeness or concealment. We do not need to decide which explanation is correct to notice how the writer creates a particular person.',
  exercise:['Choose someone from your first exercise, an existing draft or your imagination. Give them a small immediate want: to stay another minute, borrow an object, avoid a question or be useful.', 'Choose a place and one complication. Write a short scene in which they try to get what they want. Let an action, an object and something said or withheld reveal them. Use only the details the scene needs.', 'End with a choice. It may succeed, fail, complicate matters or change how we understand the person. Read back and mark the moment where this feels like a particular individual.'],
  stretch:'Give another character a reasonable but incompatible want. Rewrite the exchange without making either person a villain.',
  revision:'Find one label in your draft, such as “kind”, “lonely” or “angry”. Try replacing it with a choice only this person would make. Compare the versions and keep the one that serves your story.',
  reflection:'What does your character want, and what might they be unable to admit? You can leave the second question unanswered in the story.',
  companionTitles:['What is a Story?','Groundhog Day Exercise','What to Do When Stuck in 12 steps'],
 },
}

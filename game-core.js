(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GameCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DIFFICULTIES = [
    "easy", "hard", "medium", "medium", "easy", "hard", "easy", "medium", "hard", "medium",
    "hard", "easy", "medium", "easy", "hard", "medium", "easy", "hard", "medium", "hard",
    "easy", "medium", "hard", "easy", "medium", "hard", "medium", "easy", "hard", "medium",
    "easy", "hard", "medium", "hard", "easy", "medium", "hard", "easy", "medium", "hard",
    "medium", "easy", "hard", "medium", "easy", "hard", "medium", "hard", "easy", "hard",
    "hard", "medium", "easy", "hard", "medium", "easy", "medium", "hard", "easy", "medium",
    "hard", "easy", "medium", "hard", "medium", "easy", "hard", "medium", "easy", "hard",
    "medium", "easy", "hard", "medium", "easy", "hard", "medium", "easy", "hard", "medium",
    "easy", "medium", "hard", "hard", "medium", "easy", "hard", "medium", "easy", "hard",
    "medium", "easy", "hard", "medium", "easy", "hard", "medium", "easy", "hard", "hard"
  ];
  const BASE_POINTS = { easy: 100, medium: 200, hard: 300 };
  const SAVE_KEY = "impossible-captcha-save";
  const SAVE_VERSION = 2;
  const LEGACY_LEVEL_COUNT = 50;

  function makeLevel(id, title, type, question, instructions, hint, explanation, answer, extra) {
    return Object.assign({
      id,
      difficulty: DIFFICULTIES[id - 1],
      title,
      type,
      question,
      instructions,
      hint,
      explanation,
      answer,
      successMessage: ["Correct. The CAPTCHA has reluctantly accepted your existence.", "A surprising victory for the human-shaped participant.", "You solved it. The checkbox is trying not to look impressed."][id % 3],
      failureMessage: ["Incorrect. The CAPTCHA has added a dramatic pause.", "Not quite. Somewhere, a checkbox is sighing.", "The puzzle remains smug. Give it another try."][id % 3],
      points: BASE_POINTS[DIFFICULTIES[id - 1]]
    }, extra || {});
  }

  const LEVELS = [
    makeLevel(1, "A Very Serious Question", "multiple-choice", "Which one is the letter that comes after A?", "Select the correct answer.", "The alphabet is not hiding a trap this time.", "B comes immediately after A.", "B", { options: ["A", "B", "C", "Z"] }),
    makeLevel(2, "The Unhelpful Button", "multiple-choice", "The instructions say: do not choose the option that says “choose me.” Which option should you choose?", "Choose the option that obeys the instruction.", "The instruction says not to pick one specific option.", "Choosing “leave me alone” obeys the instruction.", "leave me alone", { options: ["choose me", "leave me alone", "both", "neither"] }),
    makeLevel(3, "The Borrowed Apple", "text", "You have 3 apples and you take away 1. How many apples do you have?", "Type a number or the number word.", "The question asks what you have after taking one.", "You took one apple, so you have one apple.", ["1", "one"]),
    makeLevel(4, "The Question About Nothing", "multiple-choice", "How many letters are in the word “nothing”?", "Count the letters in the word, not the idea.", "Look at the spelling.", "“Nothing” has seven letters.", "7", { options: ["0", "5", "7", "A philosophical amount"] }),
    makeLevel(5, "Spot the Moon", "grid", "Select the moon. It is having a quiet evening.", "Select exactly one object.", "It is the crescent-shaped object.", [ "The crescent is the moon." ], [2], { objects: [{ label: "Sun", icon: "☀️" }, { label: "Cloud", icon: "☁️" }, { label: "Moon", icon: "🌙" }, { label: "Star", icon: "⭐" }] }),
    makeLevel(6, "Do Absolutely Nothing", "multiple-choice", "Do not click the button labeled “I did it.” Which answer proves you followed the instruction?", "Choose an answer without selecting the forbidden one.", "The forbidden button is clearly labeled.", "“I did nothing” follows the instruction.", "I did nothing", { options: ["I did it", "I did nothing", "I clicked both", "I refuse to elaborate"] }),
    makeLevel(7, "The Obvious One", "multiple-choice", "Pick the option that is a color.", "Choose one.", "One answer is the name of a color.", "Blue is a color.", "Blue", { options: ["Blue", "A triangle", "Tuesday", "A polite chair"] }),
    makeLevel(8, "Next in Line", "text", "Complete the pattern: 2, 4, 6, __", "Type the next number.", "The numbers increase by the same amount each time.", "The pattern counts by two; the next number is 8.", ["8", "eight"]),
    makeLevel(9, "Three Buttons, One Rule", "order", "Press the symbols in this order: moon, key, then eye.", "Click each symbol once in the requested order.", "Read the order from left to right.", "The required order is moon, key, eye.", [2, 0, 1], { objects: [{ label: "Key", icon: "🗝️" }, { label: "Eye", icon: "👁️" }, { label: "Moon", icon: "🌙" }] }),
    makeLevel(10, "Count the Tiny Stars", "grid", "Select every star. Do not select the sun.", "Select all and only the stars.", "There are two star-shaped objects.", "The stars are the small five-pointed stars; the sun is not one.", [1, 3], { objects: [{ label: "Moon", icon: "🌙" }, { label: "Star one", icon: "⭐" }, { label: "Sun", icon: "☀️" }, { label: "Star two", icon: "🌟" }] }),
    makeLevel(11, "Reverse Psychology Department", "multiple-choice", "The CAPTCHA begs you not to choose “No.” Be kind to the CAPTCHA: what do you choose?", "Choose the answer that follows the request.", "The CAPTCHA explicitly asks you to avoid one choice.", "Choosing “Yes” is the opposite of what the CAPTCHA begs you not to choose.", "Yes", { options: ["No", "Yes", "Maybe, CAPTCHA", "Ask a lamp"] }),
    makeLevel(12, "The Quiet Room", "text", "What has a face and two hands but no arms or legs?", "Type the familiar object.", "It can tell you when it is time to leave this room.", "A clock has a face and hands.", ["clock", "a clock", "the clock"]),
    makeLevel(13, "Which Is Heavier?", "multiple-choice", "Which weighs more: a kilogram of feathers or a kilogram of keys?", "Choose the accurate answer.", "Compare the amounts, not the materials.", "They both weigh one kilogram.", "They weigh the same", { options: ["The feathers", "The keys", "They weigh the same", "The question"] }),
    makeLevel(14, "The Silent Answer", "text", "Type the word “silence.”", "Enter the requested word. The irony is intentional.", "The answer is written in the instruction.", "The instruction asks for the word silence.", ["silence"]),
    makeLevel(15, "One Is Not Like the Others", "grid", "Select the object that does not belong with the others.", "Choose exactly one object.", "Three items are used for writing; one is a fruit.", "The banana is not a writing tool.", [3], { objects: [{ label: "Pencil", icon: "✏️" }, { label: "Pen", icon: "🖊️" }, { label: "Marker", icon: "🖍️" }, { label: "Banana", icon: "🍌" }] }),
    makeLevel(16, "The Shadow Gallery", "multiple-choice", "A shadow points toward the right. Which direction is the light coming from?", "Select the best answer.", "A shadow forms on the side away from the light.", "The light comes from the left, making the shadow point right.", "left", { options: ["left", "right", "up", "from a suspicious basement"] }),
    makeLevel(17, "A Common-Sense Emergency", "multiple-choice", "If your socks are on your feet, where are your shoes most likely to go?", "Choose the sensible answer.", "Shoes are normally worn over socks.", "Shoes go on your feet, over your socks.", "on my feet", { options: ["on my feet", "in the fridge", "on the moon", "in a tiny courtroom"] }),
    makeLevel(18, "Read This Carefully", "text", "Type only the last word of this sentence: the ghost likes tea.", "Enter the final word only.", "The sentence ends with a drink.", "The last word is tea.", ["tea"]),
    makeLevel(19, "Suspicious Arithmetic", "text", "What is 10 divided by 2, then add 3?", "Follow the operations in the order written.", "Divide first, then add.", "10 / 2 is 5; 5 + 3 is 8.", ["8", "eight"]),
    makeLevel(20, "The Family Portrait", "text", "Two fathers and two sons go to a café. They order three cups, and everyone gets one. How many people are there?", "Type the number of people.", "One person can be both a son and a father.", "There are a grandfather, father, and son: three people.", ["3", "three"]),
    makeLevel(21, "The Typing Test", "text", "Type the word “human.” No need to prove anything else.", "Enter the requested word.", "It is already in the question.", "The requested word is human.", ["human", "a human"]),
    makeLevel(22, "Odd One Out: Weather", "grid", "Select the item that is not weather.", "Select exactly one.", "Three choices describe weather conditions.", "A sandwich is not weather.", [2], { objects: [{ label: "Rain", icon: "🌧️" }, { label: "Snow", icon: "❄️" }, { label: "Sandwich", icon: "🥪" }, { label: "Wind", icon: "💨" }] }),
    makeLevel(23, "The Hidden Letter", "multiple-choice", "Which lowercase letter in “shadow” appears exactly once and comes immediately after s in the alphabet?", "Choose one letter.", "The letter after s is t. Check whether it appears in the word.", "There is no t in “shadow,” so none of the listed letters satisfies both conditions.", "none", { options: ["a", "h", "w", "none"] }),
    makeLevel(24, "What Gets Wetter?", "text", "What gets wetter the more it dries?", "Type the common household object.", "It is often hanging near a shower.", "A towel gets wetter while drying things.", ["towel", "a towel"]),
    makeLevel(25, "Remember the Lanterns", "memory", "Memorize the three symbols as they appear, then repeat them in order.", "The symbols disappear after a few seconds. Click them in the same order.", "Watch the brief sequence carefully; the second symbol is not the last.", "The sequence is lantern, key, star.", [0, 2, 1], { objects: [{ label: "Lantern", icon: "🏮" }, { label: "Star", icon: "⭐" }, { label: "Key", icon: "🔑" }] }),
    makeLevel(26, "The Reverse Instruction", "multiple-choice", "Do not select the answer that is not incorrect. Which answer should you select?", "Untangle the double negative.", "“Not incorrect” means correct; do not select that.", "The instruction excludes the correct answer, so select the clearly incorrect option as the trick intends.", "incorrect", { options: ["correct", "incorrect", "neither", "the instruction"] }),
    makeLevel(27, "The Missing Number", "text", "Complete the sequence: 1, 1, 2, 3, 5, __", "Type the next number.", "Add the previous two numbers.", "The next Fibonacci number is 8.", ["8", "eight"]),
    makeLevel(28, "A Question About a Question", "multiple-choice", "Which option is spelled exactly the same as the word “cat”?", "Select one.", "Compare the letters.", "The matching word is cat.", "cat", { options: ["cat", "cap", "act", "cot"] }),
    makeLevel(29, "The Three-Step Mix-up", "text", "Start with 4. Double it, subtract 3, then add 1. What number do you get?", "Perform the steps in order and type the result.", "Do not subtract before doubling.", "4 doubled is 8; minus 3 is 5; plus 1 is 6.", ["6", "six"]),
    makeLevel(30, "The Red Door", "grid", "Select the red door, not the red warning light.", "Select exactly one object.", "Look at the object labels as well as the color.", "The door is the red door; the warning light is a different object.", [1], { objects: [{ label: "Red warning light", icon: "🚨" }, { label: "Red door", icon: "🚪" }, { label: "Blue door", icon: "🚪" }, { label: "Purple key", icon: "🗝️" }] }),
    makeLevel(31, "Slightly Silly Math", "text", "How many sides does a circle have in ordinary geometry?", "Type a number.", "Do not count the edge as a polygon side.", "A circle has zero straight sides.", ["0", "zero", "none"]),
    makeLevel(32, "The Wording Trap", "multiple-choice", "How many months have at least 28 days?", "Choose a number.", "“At least” includes months with more than 28 days.", "All 12 months have at least 28 days.", "12", { options: ["1", "2", "11", "12"] }),
    makeLevel(33, "The Shape Sequence", "text", "What comes next: circle, square, circle, square, __?", "Type the next shape.", "The two shapes alternate.", "The sequence repeats circle, square; next is circle.", ["circle", "a circle"]),
    makeLevel(34, "The Door That Runs Away", "runaway", "Catch the button marked “OPEN” before it gets stage fright.", "Click the moving OPEN button. Keyboard users can focus it and press Enter.", "It only dodges the pointer; it does not teleport.", "You caught the runaway button by clicking OPEN.", "OPEN"),
    makeLevel(35, "The Painless Riddle", "text", "What has one eye but cannot see?", "Type a common object.", "It can be used for sewing.", "A needle has an eye but cannot see.", ["needle", "a needle"]),
    makeLevel(36, "Count the E's", "text", "How many letter E's are in the word “EVERGREEN”?", "Type the count.", "Count only the letters in EVERGREEN.", "E appears four times in EVERGREEN.", ["4", "four"]),
    makeLevel(37, "The Combination Lock", "order", "Enter the combination: key, moon, key, star.", "Click the symbols in that exact order. Repeated symbols are intentional.", "The key appears twice, with the moon between them.", "The correct sequence is key, moon, key, star.", [0, 1, 0, 2], { objects: [{ label: "Key", icon: "🔑" }, { label: "Moon", icon: "🌙" }, { label: "Star", icon: "⭐" }] }),
    makeLevel(38, "The Brainless Logic Test", "multiple-choice", "A rooster lays an egg on a roof. Which side does the egg roll down?", "Choose the answer that notices the premise.", "Do roosters lay eggs?", "Roosters do not lay eggs, so no egg rolls down.", "no egg", { options: ["left", "right", "no egg", "into the attic"] }),
    makeLevel(39, "The Word That Shrinks", "text", "Which word becomes shorter when you add two letters to it?", "Type the word.", "The answer is about the word itself, not its definition.", "Adding “er” to short makes “shorter.”", ["short", "the word short"]),
    makeLevel(40, "The Last Place", "multiple-choice", "In a race, you pass the person in second place. What place are you in now?", "Choose the position you took.", "You take the place of the person you passed.", "You are in second place.", "second", { options: ["first", "second", "third", "the snack tent"] }),
    makeLevel(41, "The Tiny Telescope", "grid", "Select the only object that is both a key and golden.", "Select exactly one.", "One key is silver; the other is gold.", "The golden key is the gold-colored key.", [2], { objects: [{ label: "Silver key", icon: "🗝️" }, { label: "Golden coin", icon: "🪙" }, { label: "Golden key", icon: "🔑" }, { label: "Silver coin", icon: "⚪" }] }),
    makeLevel(42, "The Wet Umbrella", "multiple-choice", "It is raining. You open an umbrella. What does the umbrella help keep dry?", "Select the most sensible answer.", "Think about what an umbrella covers.", "An umbrella helps keep you dry.", "me", { options: ["me", "the rain", "the clouds", "a nearby fish"] }),
    makeLevel(43, "The CAPTCHA's Plea", "multiple-choice", "The CAPTCHA says, “Please do not answer with the word YES.” What should you answer to obey it?", "Choose the answer that follows the CAPTCHA's request.", "Avoid the exact word the CAPTCHA forbids.", "NO obeys the request not to say YES.", "NO", { options: ["YES", "NO", "yesn't", "I brought a sandwich"] }),
    makeLevel(44, "The Pocket Inventory", "text", "You put a coin in your left pocket, then move it to your right pocket. Which pocket has the coin now?", "Type left or right.", "It was moved after it was put in the first pocket.", "The coin is in the right pocket.", ["right", "right pocket"]),
    makeLevel(45, "The Easy One (Probably)", "text", "Type the number of fingers on one human hand, using the usual count.", "Type a number or number word.", "Thumbs are included in the usual count.", "One hand has five digits, including the thumb.", ["5", "five"]),
    makeLevel(46, "Final-Boss Warm-up", "multiple-choice", "A sign says “Ignore this sign.” What is the most literal thing to do?", "Choose the action that follows the sign.", "If you ignore it, you are following its instruction.", "Ignore the sign is the literal instruction.", "ignore it", { options: ["read it forever", "ignore it", "eat the sign", "ask it for directions"] }),
    makeLevel(47, "The Mixed-Up Clock", "text", "A clock shows 3:00. What is the smaller angle between its hands, in degrees?", "Type the angle.", "At 3:00, the minute hand is at 12 and the hour hand at 3.", "The hands form a right angle: 90 degrees.", ["90", "90 degrees", "ninety"]),
    makeLevel(48, "The Advanced Non-Answer", "multiple-choice", "Which answer is the only one that is both a number and not a number?", "Select the option that openly admits the contradiction.", "The puzzle is intentionally absurd; choose the self-contradictory option.", "“A number wearing a fake mustache” is the deliberately contradictory joke answer.", "a number wearing a fake mustache", { options: ["7", "banana", "a number wearing a fake mustache", "none"] }),
    makeLevel(49, "The Lone Star", "grid", "Select the only five-pointed star. The moon and key are innocent bystanders.", "Select exactly one object.", "Look for the object with five points.", "The star is the five-pointed object.", [1], { objects: [{ label: "Moon", icon: "🌙" }, { label: "Star", icon: "⭐" }, { label: "Key", icon: "🔑" }] }),
    makeLevel(50, "The Three-Part Passcode", "multiple-choice", "Take the last letter of SHADOW, then the first letter of LANTERN, then the number of letters in EYE. Which code do you get?", "Complete all three steps in order.", "Use W from SHADOW, L from LANTERN, and count the letters in EYE.", "The clues give W, then L, then 3: the code is WL3.", "WL3", { options: ["WL3", "LW3", "WL2", "A very sleepy password"] }),
    makeLevel(51, "The Number That Loses a Letter", "text", "I am an odd number. Remove my first letter and I become even. What number am I?", "Type the number as a word.", "Remove the first letter from “seven.”", "Seven is odd; removing its first letter leaves “even.”", ["seven"]),
    makeLevel(52, "The Three-Word Receipt", "multiple-choice", "A server writes “T for 3” on an order slip. Read it aloud: what did the table order?", "Choose the phrase that sounds like the note.", "Say the letter T and the words “for three” together.", "“T for three” sounds like “tea for three.”", "tea for three", { options: ["three coffees", "tea for three", "one receipt", "the cashier's autograph"] }),
    makeLevel(53, "The Tool Shed", "grid", "Select the only tool meant to turn a screw.", "Select exactly one object.", "A screwdriver has its purpose in its name.", "The screwdriver turns screws.", [2], { objects: [{ label: "Spoon", icon: "🥄" }, { label: "Paintbrush", icon: "🖌️" }, { label: "Screwdriver", icon: "🪛" }, { label: "Comb", icon: "🪮" }] }),
    makeLevel(54, "The Forbidden Answer", "multiple-choice", "Choose an answer, but do not choose the word “allowed.” Which listed answer follows that instruction?", "Read the restriction before choosing.", "One option is explicitly forbidden.", "“Permitted” is not the forbidden word “allowed.”", "permitted", { options: ["allowed", "permitted", "both words", "the question mark"] }),
    makeLevel(55, "The Calendar's Complaint", "text", "A meeting starts at 2:15 and lasts 45 minutes. What time does it end?", "Type the time using a colon.", "Add 45 minutes to the starting time.", "Forty-five minutes after 2:15 is 3:00.", ["3:00"]),
    makeLevel(56, "The Noisy Neighbor", "multiple-choice", "Which animal is famous for saying “meow”?", "Choose the familiar animal.", "The answer may be sleeping on a keyboard.", "A cat says meow.", "cat", { options: ["cat", "duck", "horse", "very small trumpet"] }),
    makeLevel(57, "The Alternating Lanterns", "text", "Continue the pattern: red, blue, blue, red, blue, blue, __.", "Type the next color.", "The three-color rhythm repeats.", "The cycle is red, blue, blue; red starts the next cycle.", ["red"]),
    makeLevel(58, "The Very Literal Sign", "multiple-choice", "A sign says “Turn around.” Which action obeys it without moving from your spot?", "Choose the action, not a travel destination.", "Your body can turn while your feet stay put.", "Turning in place follows the sign.", "turn in place", { options: ["walk around the building", "turn in place", "mail the sign a map", "ignore gravity"] }),
    makeLevel(59, "The Fruit with a Peel", "grid", "Select the fruit you can peel by hand.", "Select exactly one object.", "It is a curved yellow fruit.", "A banana is normally peeled by hand.", [0], { objects: [{ label: "Banana", icon: "🍌" }, { label: "Bread", icon: "🍞" }, { label: "Cheese", icon: "🧀" }, { label: "Carrot", icon: "🥕" }] }),
    makeLevel(60, "The Two-Step Receipt", "text", "A ticket costs 6 coins. You buy two tickets and pay with 20 coins. How many coins should you get back?", "Type a number.", "First find the total cost of two tickets.", "Two tickets cost 12 coins; 20 minus 12 is 8.", ["8", "eight"]),
    makeLevel(61, "The Uninvited Syllable", "multiple-choice", "The instruction says “pick the option with exactly two syllables.” Which one qualifies?", "Say each option aloud and count vowel beats.", "“Lantern” has two vowel beats.", "Lantern has two syllables: lan-tern.", "lantern", { options: ["lantern", "key", "cat", "mysterious"] }),
    makeLevel(62, "The Helpful Umbrella", "multiple-choice", "What do you open to keep rain off your head?", "Pick the ordinary answer.", "It folds up and goes in a bag.", "An umbrella keeps rain off you.", "umbrella", { options: ["umbrella", "a frying pan", "a sock puppet", "a polite email"] }),
    makeLevel(63, "The Clockwork Sequence", "text", "A clock chimes every 5 minutes: 5, 10, 15, __. What is next?", "Type the next number.", "The interval stays the same.", "The next multiple of five is 20.", ["20", "twenty"]),
    makeLevel(64, "The Carefully Worded Queue", "multiple-choice", "Mira is ahead of Jo. Jo is ahead of Lee. Who is last in the queue?", "Follow both relationships in order.", "Lee is behind the other two.", "Mira, Jo, Lee: Lee is last.", "Lee", { options: ["Mira", "Jo", "Lee", "the queue itself"] }),
    makeLevel(65, "The Missing Socks", "text", "You put 4 pairs of socks in a drawer. How many individual socks is that?", "Type the number.", "Each pair contains two socks.", "Four pairs contain eight individual socks.", ["8", "eight"]),
    makeLevel(66, "The Hungry Pencil", "multiple-choice", "Which object is most likely to need sharpening after writing?", "Choose the traditional writing tool.", "It has a graphite core.", "A pencil needs sharpening.", "pencil", { options: ["pencil", "spoon", "window", "moonlight"] }),
    makeLevel(67, "The Backwards Instruction", "multiple-choice", "Read from right to left: which word do the letters N O O M spell?", "Select the word formed by reversing the letters.", "Reverse the order, not each letter's shape.", "N-O-O-M reversed spells M-O-O-N.", "MOON", { options: ["MOON", "NOOM", "MOO", "A surprised face"] }),
    makeLevel(68, "The Square's Secret", "text", "A square has four equal sides. If each side is 3 cm, what is its perimeter?", "Type the number of centimeters.", "Perimeter is the sum of all four sides.", "Four sides of 3 cm make a perimeter of 12 cm.", ["12", "12 cm", "twelve"]),
    makeLevel(69, "The Warm Drink", "grid", "Select the mug, not the teapot.", "Select exactly one object.", "A mug is the small cup with a handle.", "The mug is the drinking cup.", [1], { objects: [{ label: "Teapot", icon: "🫖" }, { label: "Mug", icon: "☕" }, { label: "Bowl", icon: "🥣" }, { label: "Vase", icon: "🏺" }] }),
    makeLevel(70, "The Careful Three-Step", "text", "Start with 18. Subtract 6, divide the result by 3, then add 4. What is the result?", "Apply the operations in the order given.", "Do not divide until after subtracting six.", "18 − 6 = 12; 12 ÷ 3 = 4; 4 + 4 = 8.", ["8", "eight"]),
    makeLevel(71, "The Three-Letter Lock", "order", "Tap the letters in alphabetical order: C, A, then B.", "Tap A, then B, then C.", "Alphabetical order begins with A.", "The letters in alphabetical order are A, B, C.", [1, 2, 0], { objects: [{ label: "C", icon: "🇨" }, { label: "A", icon: "🇦" }, { label: "B", icon: "🇧" }] }),
    makeLevel(72, "The Night Light", "multiple-choice", "Which one usually appears in the night sky and twinkles?", "Pick the small shining object.", "It is not the moon.", "A star twinkles in the night sky.", "star", { options: ["star", "pillow", "toaster", "shoe"] }),
    makeLevel(73, "The Two Envelopes", "text", "One envelope is labelled “letters” and one “not letters.” You are told the first label is correct. What is inside the first envelope?", "Type the contents.", "The statement tells you whether to trust its label.", "The first label is correct, so it contains letters.", ["letters", "letter"]),
    makeLevel(74, "The Hidden Double", "multiple-choice", "In the word “bookkeeper,” which letter appears twice in a row?", "Choose the doubled letter.", "Scan for a repeated pair.", "The word contains “oo,” “kk,” and “ee”; the option “oo” is one such pair.", "oo", { options: ["oo", "bb", "pp", "rr"] }),
    makeLevel(75, "The Quiet Keyboard", "text", "Type the number of keys on a standard piano octave, counting both white and black keys.", "Type a number.", "An octave runs from one C to the next C.", "There are 12 semitone keys in an octave.", ["12", "twelve"]),
    makeLevel(76, "The Three Switches", "order", "To light the lamp, press switches marked START, then GLOW, then DONE.", "Click each switch once in that exact sequence.", "The labels describe a natural beginning-to-end order.", "The required sequence is START, GLOW, DONE.", [1, 2, 0], { objects: [{ label: "DONE", icon: "✅" }, { label: "START", icon: "▶️" }, { label: "GLOW", icon: "💡" }] }),
    makeLevel(77, "The Empty Glass", "multiple-choice", "A glass is half full of water. What is in the other half if it contains no liquid?", "Choose the ordinary answer.", "The glass is not in a vacuum.", "The other half contains air.", "air", { options: ["air", "another glass", "a tiny whale", "nothing at all"] }),
    makeLevel(78, "The Lunchbox Check", "grid", "Select the only item that is normally eaten with a spoon.", "Select exactly one object.", "It is served in a bowl.", "Soup is normally eaten with a spoon.", [2], { objects: [{ label: "Sandwich", icon: "🥪" }, { label: "Apple", icon: "🍎" }, { label: "Soup", icon: "🍲" }, { label: "Cracker", icon: "🍘" }] }),
    makeLevel(79, "The Reverse Countdown", "text", "A countdown goes 9, 6, 3, __. What comes next if the same step continues?", "Type the next number.", "Each step subtracts three.", "Three minus three is zero.", ["0", "zero"]),
    makeLevel(80, "The Odd Riddle Out", "multiple-choice", "What has a neck but no head, and can hold a drink?", "Choose the household object.", "It may have a cork.", "A bottle has a neck and holds a drink.", "bottle", { options: ["bottle", "shirt", "giraffe", "lamp"] }),
    makeLevel(81, "The One-Word Order", "text", "Type the word that comes first alphabetically: pear, apple, plum.", "Type one fruit.", "Compare the first letters.", "Apple comes before pear and plum.", ["apple"]),
    makeLevel(82, "The Looping Shapes", "text", "Continue the repeating pattern: triangle, circle, square, triangle, circle, __.", "Type the next shape.", "The three-shape cycle starts again.", "Square follows circle in the repeating sequence.", ["square"]),
    makeLevel(83, "The Two-Digit Vault", "text", "The code is the number of sides on a hexagon followed by the number of corners on a square. Type the two digits.", "Use the order stated in the clue.", "A hexagon has six sides; a square has four corners.", "The code is 6 followed by 4: 64.", ["64", "sixty four", "sixty-four"]),
    makeLevel(84, "The Careful Mirror", "multiple-choice", "Which word is spelled the same forward and backward?", "Choose the palindrome.", "It is a small creature that likes cheese in cartoons.", "“level” reads the same in either direction.", "level", { options: ["level", "lever", "lemon", "velvet"] }),
    makeLevel(85, "The Quiet Librarian", "text", "Three books are stacked: the red book is above the blue book, and the blue book is above the green book. Which book is on the bottom?", "Type its color.", "Follow the stack from top to bottom.", "Red, blue, green: the green book is at the bottom.", ["green"]),
    makeLevel(86, "The Rainy Window", "multiple-choice", "You are indoors and look out through a clean window. What are you looking at?", "Choose the view beyond the glass.", "The glass is transparent.", "You are looking at the outside view through the window.", "outside", { options: ["outside", "through a brick wall", "yesterday", "inside a sandwich"] }),
    makeLevel(87, "The Four-Word Password", "order", "Tap the words to make this instruction: READ THE QUESTION FIRST.", "Click the four word tiles in that exact order.", "The first tile is READ.", "The order is READ, THE, QUESTION, FIRST.", [2, 0, 3, 1], { objects: [{ label: "THE", icon: "📰" }, { label: "FIRST", icon: "1️⃣" }, { label: "READ", icon: "📖" }, { label: "QUESTION", icon: "❔" }] }),
    makeLevel(88, "The Paper Plane", "multiple-choice", "You fold a paper plane and let it go indoors. Which force pulls it toward the floor?", "Choose the familiar force.", "It also keeps your chair on the ground.", "Gravity pulls the plane toward the floor.", "gravity", { options: ["gravity", "politeness", "the color blue", "a tiny magnet in the carpet"] }),
    makeLevel(89, "The Number of Vowels", "text", "How many vowels are in the word “CAPTCHA” using A, E, I, O, U?", "Type the count.", "Count only A, E, I, O, and U.", "CAPTCHA contains A and A: two vowels.", ["2", "two"]),
    makeLevel(90, "The Three Honest Clues", "multiple-choice", "A key is in one box. A says “Not in B.” B says “In B.” C says “Not in C.” Exactly one label is true. Where is the key?", "Check which location makes exactly one statement true.", "Test each possible box; count the true labels each time.", "In C: A is true, while B and C are false. The other locations make two labels true.", "box C", { options: ["box A", "box B", "box C", "it is in all three"] }),
    makeLevel(91, "The Double Sandwich", "text", "A sandwich is cut once straight from edge to edge. Into how many pieces is it divided?", "Type a number.", "One complete cut splits one object into two parts.", "One straight cut through the sandwich makes two pieces.", ["2", "two"]),
    makeLevel(92, "The Opposite Pair", "multiple-choice", "Which word means the opposite of “ancient”?", "Pick the direct opposite.", "Think old versus new.", "Modern is the opposite of ancient.", "modern", { options: ["modern", "dusty", "historical", "very old"] }),
    makeLevel(93, "The Three-Cup Memory", "memory", "Memorize the cups in order, then repeat their symbols.", "The symbols disappear after a few seconds; click them in the same order.", "Remember the cup, key, star sequence.", "The sequence is cup, key, star.", [1, 0, 2], { objects: [{ label: "Key", icon: "🔑" }, { label: "Cup", icon: "🥤" }, { label: "Star", icon: "⭐" }] }),
    makeLevel(94, "The Odd Calendar", "text", "How many days are in two ordinary non-leap February months combined?", "Type the total number of days.", "Each ordinary February has 28 days.", "Two 28-day Februaries total 56 days.", ["56", "fifty six", "fifty-six"]),
    makeLevel(95, "The Polite Door", "multiple-choice", "Which action normally opens a closed door without breaking it?", "Choose the everyday action.", "The handle is there for a reason.", "Turning the handle and opening the door is the ordinary action.", "turn the handle", { options: ["turn the handle", "argue with the hinges", "ask a cloud", "count the floor tiles"] }),
    makeLevel(96, "The Three-Color Memory", "memory", "Watch the colors in order, then replay them.", "After the colors disappear, click the matching color tiles in order.", "Remember purple, red, then blue.", "The sequence is purple, red, blue.", [2, 0, 1], { objects: [{ label: "Red", icon: "🟥" }, { label: "Blue", icon: "🟦" }, { label: "Purple", icon: "🟪" }] }),
    makeLevel(97, "The Secret Word Shape", "text", "Take the first letter of MOON, the last of STAR, and the first of KEY. Type the three-letter result.", "Follow the letter positions in order.", "First, last, first.", "M + R + K makes MRK.", ["mrk"]),
    makeLevel(98, "The Last Laugh", "multiple-choice", "Which option is a question mark?", "Select the punctuation symbol.", "It is the curved mark at the end of this sentence?", "The question mark is “?”.", "?", { options: [".", "!", "?", ","] }),
    makeLevel(99, "The Almost-Final Sequence", "order", "Arrange the steps of making toast: EAT, TOAST, BREAD, PRESS LEVER.", "Click the actions in a sensible real-world order.", "Bread goes in before the lever is pressed; toast comes out before eating.", "Put in bread, press the lever, get toast, then eat.", [2, 3, 1, 0], { objects: [{ label: "EAT", icon: "😋" }, { label: "TOAST", icon: "🍞" }, { label: "BREAD", icon: "🥖" }, { label: "PRESS LEVER", icon: "👇" }] }),
    makeLevel(100, "THE FINAL CAPTCHA", "order", "Final boss: tap these symbols in the order that spells HUMAN: heart, umbrella, moon, apple, needle.", "Click each symbol once in that exact order to complete all 100 levels.", "The first letters spell HUMAN. This is a word puzzle, not a device scan.", "Heart, umbrella, moon, apple, needle spell H-U-M-A-N. You completed the whole game.", [3, 1, 2, 0, 4], { finalBoss: true, objects: [{ label: "Apple", icon: "🍎" }, { label: "Umbrella", icon: "☂️" }, { label: "Moon", icon: "🌙" }, { label: "Heart", icon: "❤️" }, { label: "Needle", icon: "🪡" }] })
  ];
  const TOTAL_LEVELS = LEVELS.length;

  function normalizeText(value) {
    return String(value == null ? "" : value).trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
  }

  function sameSequence(actual, expected) {
    return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => value === expected[index]);
  }

  function validateAnswer(level, submission) {
    if (!level) return false;
    if (level.type === "grid") {
      const selected = Array.isArray(submission) ? [...new Set(submission)].sort((a, b) => a - b) : [];
      const expected = [...level.answer].sort((a, b) => a - b);
      return sameSequence(selected, expected);
    }
    if (level.type === "order" || level.type === "memory") return sameSequence(submission, level.answer);
    const accepted = Array.isArray(level.answer) ? level.answer : [level.answer];
    return accepted.some(answer => normalizeText(answer) === normalizeText(submission));
  }

  function createInitialState() {
    return {
      highestUnlocked: 1,
      currentLevelId: 1,
      completedLevels: [],
      skippedLevels: [],
      levelScores: {},
      hintedLevels: [],
      hintsUsed: 0,
      skipsUsed: 0,
      attemptsByLevel: {},
      attemptsTotal: 0,
      score: 0,
      bestScore: 0,
      soundEnabled: false,
      startedAt: null,
      finishedAt: null
    };
  }

  function sanitizeState(candidate, maxLevel = TOTAL_LEVELS) {
    const fresh = createInitialState();
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return fresh;
    const validIds = value => Array.isArray(value)
      ? [...new Set(value.filter(id => Number.isInteger(id) && id >= 1 && id <= maxLevel))].sort((a, b) => a - b)
      : [];
    const completed = validIds(candidate.completedLevels);
    const skipped = validIds(candidate.skippedLevels);
    const hinted = validIds(candidate.hintedLevels);
    const scores = {};
    if (candidate.levelScores && typeof candidate.levelScores === "object" && !Array.isArray(candidate.levelScores)) {
      for (const id of completed) {
        const amount = Number(candidate.levelScores[id]);
        const maxAward = BASE_POINTS[LEVELS[id - 1].difficulty] + 25;
        if (Number.isFinite(amount) && amount >= 0 && amount <= maxAward) scores[id] = Math.floor(amount);
      }
    }
    const attempts = {};
    if (candidate.attemptsByLevel && typeof candidate.attemptsByLevel === "object" && !Array.isArray(candidate.attemptsByLevel)) {
      for (let id = 1; id <= maxLevel; id += 1) {
        const value = Number(candidate.attemptsByLevel[id]);
        if (Number.isInteger(value) && value >= 0 && value <= 100000) attempts[id] = value;
      }
    }
    const savedUnlocked = Number.isInteger(candidate.highestUnlocked) && candidate.highestUnlocked >= 1 && candidate.highestUnlocked <= maxLevel
      ? candidate.highestUnlocked
      : 1;
    const milestoneUnlocked = Math.max(1, ...completed.map(id => Math.min(maxLevel, id + 1)), ...skipped.map(id => Math.min(maxLevel, id + 1)));
    const derivedUnlocked = Math.max(savedUnlocked, milestoneUnlocked);
    const maxScore = LEVELS.reduce((sum, level) => sum + level.points + 25, 0);
    const score = Number.isFinite(candidate.score) && candidate.score >= 0
      ? Math.min(maxScore, Math.floor(candidate.score))
      : Object.values(scores).reduce((sum, value) => sum + value, 0);
    const currentLevelId = Number.isInteger(candidate.currentLevelId) && candidate.currentLevelId >= 1 && candidate.currentLevelId <= maxLevel
      ? candidate.currentLevelId
      : derivedUnlocked;
    return {
      highestUnlocked: derivedUnlocked,
      currentLevelId,
      completedLevels: completed,
      skippedLevels: skipped,
      levelScores: scores,
      hintedLevels: hinted,
      hintsUsed: Number.isInteger(candidate.hintsUsed) && candidate.hintsUsed >= 0 ? candidate.hintsUsed : 0,
      skipsUsed: Number.isInteger(candidate.skipsUsed) && candidate.skipsUsed >= 0 ? candidate.skipsUsed : 0,
      attemptsByLevel: attempts,
      attemptsTotal: Number.isInteger(candidate.attemptsTotal) && candidate.attemptsTotal >= 0 ? candidate.attemptsTotal : Object.values(attempts).reduce((sum, value) => sum + value, 0),
      score,
      bestScore: Math.max(score, Number.isFinite(candidate.bestScore) && candidate.bestScore >= 0 ? Math.min(maxScore, Math.floor(candidate.bestScore)) : 0),
      soundEnabled: candidate.soundEnabled === true,
      startedAt: Number.isFinite(candidate.startedAt) && candidate.startedAt > 0 ? candidate.startedAt : null,
      finishedAt: Number.isFinite(candidate.finishedAt) && candidate.finishedAt > 0 ? candidate.finishedAt : null
    };
  }

  function migrateSave(parsed) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
      return { valid: false, migrated: false, state: createInitialState() };
    }
    if (parsed.version === SAVE_VERSION) {
      return { valid: true, migrated: false, state: sanitizeState(parsed.data) };
    }
    if (parsed.version === 1) {
      const oldData = parsed.data;
      const legacy = Object.assign({}, oldData, {
        highestUnlocked: Number.isInteger(oldData.highestUnlocked) ? Math.min(LEGACY_LEVEL_COUNT, oldData.highestUnlocked) : 1,
        completedLevels: Array.isArray(oldData.completedLevels) ? oldData.completedLevels.filter(id => Number.isInteger(id) && id >= 1 && id <= LEGACY_LEVEL_COUNT) : [],
        skippedLevels: Array.isArray(oldData.skippedLevels) ? oldData.skippedLevels.filter(id => Number.isInteger(id) && id >= 1 && id <= LEGACY_LEVEL_COUNT) : [],
        hintedLevels: Array.isArray(oldData.hintedLevels) ? oldData.hintedLevels.filter(id => Number.isInteger(id) && id >= 1 && id <= LEGACY_LEVEL_COUNT) : [],
        currentLevelId: Number.isInteger(oldData.currentLevelId)
          ? Math.min(LEGACY_LEVEL_COUNT, Math.max(1, oldData.currentLevelId))
          : Number.isInteger(oldData.highestUnlocked) ? Math.min(LEGACY_LEVEL_COUNT, Math.max(1, oldData.highestUnlocked)) : 1
      });
      if (legacy.attemptsByLevel && typeof legacy.attemptsByLevel === "object") {
        legacy.attemptsByLevel = Object.fromEntries(Object.entries(legacy.attemptsByLevel)
          .filter(([id, count]) => Number(id) >= 1 && Number(id) <= LEGACY_LEVEL_COUNT && Number.isInteger(count) && count >= 0));
      }
      if (legacy.levelScores && typeof legacy.levelScores === "object") {
        legacy.levelScores = Object.fromEntries(Object.entries(legacy.levelScores)
          .filter(([id, score]) => Number(id) >= 1 && Number(id) <= LEGACY_LEVEL_COUNT && Number.isFinite(score) && score >= 0));
      }
      return { valid: true, migrated: true, state: sanitizeState(legacy) };
    }
    return { valid: false, migrated: false, state: createInitialState() };
  }

  function validateCatalog(levels) {
    const problems = [];
    if (!Array.isArray(levels) || levels.length !== DIFFICULTIES.length) problems.push(`Catalog must contain exactly ${DIFFICULTIES.length} levels.`);
    const seenIds = new Set();
    const seenTitles = new Set();
    const seenQuestions = new Set();
    (Array.isArray(levels) ? levels : []).forEach((level, index) => {
      const expectedId = index + 1;
      if (!level || level.id !== expectedId || seenIds.has(level.id)) problems.push(`Level ${expectedId} has a missing, duplicate, or out-of-order ID.`);
      if (level) {
        seenIds.add(level.id);
        if (level.difficulty !== DIFFICULTIES[index]) problems.push(`Level ${expectedId} difficulty is out of sequence.`);
        if (!level.title || seenTitles.has(normalizeText(level.title))) problems.push(`Level ${expectedId} has a missing or duplicate title.`);
        if (!level.question || /placeholder|coming soon|todo/i.test(level.question) || seenQuestions.has(normalizeText(level.question))) problems.push(`Level ${expectedId} has a missing, placeholder, or duplicate question.`);
        seenTitles.add(normalizeText(level.title || ""));
        seenQuestions.add(normalizeText(level.question || ""));
        for (const field of ["instructions", "hint", "explanation", "successMessage", "failureMessage"]) {
          if (!level[field]) problems.push(`Level ${expectedId} is missing ${field}.`);
        }
        if (level.points !== BASE_POINTS[level.difficulty]) problems.push(`Level ${expectedId} has invalid scoring.`);
        if (!["multiple-choice", "text", "grid", "order", "memory", "runaway"].includes(level.type)) problems.push(`Level ${expectedId} has an unsupported challenge type.`);
        if (["multiple-choice", "text", "runaway"].includes(level.type) && (level.answer == null || (Array.isArray(level.answer) && !level.answer.length))) problems.push(`Level ${expectedId} has no valid answer.`);
        if (level.type === "multiple-choice" && (!Array.isArray(level.options) || !level.options.length || !level.options.some(option => normalizeText(option) === normalizeText(level.answer)))) problems.push(`Level ${expectedId} has no matching multiple-choice option.`);
        if (["grid", "order", "memory"].includes(level.type)) {
          if (!Array.isArray(level.objects) || !Array.isArray(level.answer) || !level.answer.length) problems.push(`Level ${expectedId} has invalid interactive data.`);
          else if (level.answer.some(value => !Number.isInteger(value) || value < 0 || value >= level.objects.length)) problems.push(`Level ${expectedId} references an invalid object index.`);
        }
      }
    });
    return { valid: problems.length === 0, problems };
  }

  function openLevel(state, id) {
    return Number.isInteger(id) && id >= 1 && id <= TOTAL_LEVELS && id <= state.highestUnlocked;
  }

  function unlockAfter(state, id) {
    return Object.assign({}, state, { highestUnlocked: Math.min(TOTAL_LEVELS, Math.max(state.highestUnlocked, id + 1)) });
  }

  function useHint(state, id) {
    if (state.hintedLevels.includes(id)) {
      return {
        state: Object.assign({}, state, { hintsUsed: state.hintsUsed + 1 }),
        charged: false
      };
    }
    const updated = Object.assign({}, state, {
      hintedLevels: [...state.hintedLevels, id],
      hintsUsed: state.hintsUsed + 1,
      score: Math.max(0, state.score - 25)
    });
    return { state: updated, charged: true };
  }

  function skipLevel(state, id) {
    if (state.completedLevels.includes(id)) return { state, charged: false };
    const alreadySkipped = state.skippedLevels.includes(id);
    const next = Object.assign({}, state, {
      skippedLevels: alreadySkipped ? state.skippedLevels : [...state.skippedLevels, id],
      skipsUsed: state.skipsUsed + 1,
      score: alreadySkipped ? state.score : Math.max(0, state.score - 50),
      highestUnlocked: Math.min(TOTAL_LEVELS, Math.max(state.highestUnlocked, id + 1)),
      currentLevelId: Math.min(TOTAL_LEVELS, id + 1)
    });
    return { state: next, charged: !alreadySkipped };
  }

  function recordAttempt(state, id) {
    return Object.assign({}, state, {
      attemptsByLevel: Object.assign({}, state.attemptsByLevel, { [id]: (state.attemptsByLevel[id] || 0) + 1 }),
      attemptsTotal: state.attemptsTotal + 1
    });
  }

  function completeLevel(state, level) {
    if (state.completedLevels.includes(level.id)) {
      return { state: unlockAfter(state, level.id), awarded: 0, alreadyCompleted: true };
    }
    const award = Math.max(0, level.points + (state.hintedLevels.includes(level.id) ? 0 : 25));
    const scores = Object.assign({}, state.levelScores, { [level.id]: award });
    const completedLevels = [...state.completedLevels, level.id].sort((a, b) => a - b);
    const score = Math.max(0, state.score + award);
    const updated = unlockAfter(Object.assign({}, state, {
      completedLevels,
      levelScores: scores,
      score,
      bestScore: Math.max(state.bestScore, score),
      currentLevelId: Math.min(TOTAL_LEVELS, level.id + 1),
      finishedAt: level.id === TOTAL_LEVELS && completedLevels.length === TOTAL_LEVELS ? Date.now() : state.finishedAt
    }), level.id);
    return { state: updated, awarded: award, alreadyCompleted: false };
  }

  function getLevelStatus(state, id) {
    if (state.completedLevels.includes(id)) return "completed";
    if (state.skippedLevels.includes(id)) return "skipped";
    if (id <= state.highestUnlocked) return "unlocked";
    return "locked";
  }

  return {
    BASE_POINTS, DIFFICULTIES, LEVELS, LEGACY_LEVEL_COUNT, SAVE_KEY, SAVE_VERSION, TOTAL_LEVELS,
    completeLevel, createInitialState, getLevelStatus, migrateSave, normalizeText, openLevel,
    recordAttempt, sanitizeState, skipLevel, useHint, validateAnswer, validateCatalog
  };
});

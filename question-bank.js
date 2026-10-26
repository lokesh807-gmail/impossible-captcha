(function (root) {
  "use strict";

  const rows = [
    ["apt-01", "easy", "Percentages", "What is 25% of 80?", "20", ["10", "20", "25", "40"], "A quarter is 25%.", "25% is one quarter, and 80 divided by 4 is 20."],
    ["apt-02", "easy", "Profit and loss", "A book bought for ₹120 is sold for ₹150. What is the profit?", "₹30", ["₹20", "₹25", "₹30", "₹40"], "Subtract the cost price from the selling price.", "Profit = selling price − cost price = ₹150 − ₹120 = ₹30."],
    ["apt-03", "easy", "Ratio", "A drink uses 2 cups of juice for every 3 cups of water. How many cups of water are needed for 4 cups of juice?", "6", ["5", "6", "7", "8"], "Multiply both parts of the ratio by the same number.", "The juice amount doubled from 2 to 4, so water doubles from 3 to 6."],
    ["apt-04", "easy", "Average", "What is the average of 6, 8, and 10?", "8", ["7", "8", "9", "10"], "Add the values, then divide by three.", "(6 + 8 + 10) ÷ 3 = 24 ÷ 3 = 8."],
    ["apt-05", "easy", "Speed and distance", "A cyclist travels 30 km in 2 hours at a steady speed. What is the speed?", "15 km/h", ["10 km/h", "12 km/h", "15 km/h", "60 km/h"], "Speed = distance ÷ time.", "30 km ÷ 2 hours = 15 km/h."],
    ["apt-06", "easy", "Simplification", "Evaluate 18 ÷ 3 + 4 × 2 using the usual order of operations.", "14", ["10", "14", "20", "28"], "Do division and multiplication before addition.", "18 ÷ 3 = 6 and 4 × 2 = 8; then 6 + 8 = 14."],
    ["apt-07", "easy", "Number series", "What number comes next: 4, 7, 10, 13, ...?", "16", ["15", "16", "17", "18"], "Look at the constant difference.", "Each term increases by 3, so 13 + 3 = 16."],
    ["apt-08", "medium", "Simple interest", "Find the simple interest on ₹1,000 at 5% per year for 2 years.", "₹100", ["₹50", "₹100", "₹105", "₹200"], "Use interest = principal × rate × time ÷ 100.", "SI = 1000 × 5 × 2 ÷ 100 = ₹100."],
    ["apt-09", "medium", "Time and work", "A worker completes a job in 6 days at a constant rate. What fraction of the job is completed in 2 days?", "1/3", ["1/2", "1/3", "1/4", "2/3"], "Divide the time worked by the total time.", "2 ÷ 6 = 1/3 of the job."],
    ["apt-10", "medium", "Percentage change", "A ₹200 item is discounted by 10%. What is its sale price?", "₹180", ["₹170", "₹180", "₹190", "₹198"], "Find 10% of ₹200 and subtract it.", "10% of ₹200 is ₹20, so the sale price is ₹200 − ₹20 = ₹180."],
    ["apt-11", "medium", "Proportion", "If 5 identical notebooks cost ₹75, what do 8 notebooks cost at the same rate?", "₹120", ["₹100", "₹110", "₹120", "₹135"], "Find the price of one notebook first.", "One costs ₹75 ÷ 5 = ₹15; eight cost 8 × ₹15 = ₹120."],
    ["apt-12", "medium", "Average", "The average of four numbers is 12. What is their total?", "48", ["16", "36", "48", "60"], "Total = average × number of values.", "12 × 4 = 48."],
    ["apt-13", "medium", "Compound interest", "₹100 earns 10% compound interest per year. What is the amount after 2 years?", "₹121", ["₹120", "₹121", "₹122", "₹200"], "Apply the 10% increase twice.", "After year one the amount is ₹110; 10% of ₹110 is ₹11, giving ₹121."],
    ["apt-14", "medium", "Probability", "A fair six-sided die is rolled once. What is the probability of rolling an even number?", "1/2", ["1/6", "1/3", "1/2", "2/3"], "Three of the six faces are even.", "The favorable faces are 2, 4, and 6, so the probability is 3/6 = 1/2."],
    ["apt-15", "medium", "Ages", "Mina is 12 and her brother is 8. How many years older is Mina?", "4 years", ["2 years", "3 years", "4 years", "5 years"], "Subtract the younger age from the older age.", "12 − 8 = 4 years."],
    ["apt-16", "hard", "Work rates", "One pump fills a tank in 4 hours and an identical pump also fills it in 4 hours. How long do both take together?", "2 hours", ["1 hour", "2 hours", "3 hours", "4 hours"], "Together their hourly rates add.", "Each fills 1/4 of the tank per hour; together they fill 1/2 per hour, so the tank takes 2 hours."],
    ["apt-17", "hard", "Mixtures", "A 10 L mixture is 20% syrup. How many litres of syrup does it contain?", "2 L", ["1 L", "2 L", "5 L", "8 L"], "Convert 20% to 0.20 and multiply by the total.", "0.20 × 10 L = 2 L of syrup."],
    ["apt-18", "hard", "Combinations", "How many different pairs can be chosen from 5 people?", "10", ["5", "8", "10", "20"], "Use n(n − 1) ÷ 2 for unordered pairs.", "5 × 4 ÷ 2 = 10 pairs."],
    ["apt-19", "hard", "Number systems", "What is the remainder when 47 is divided by 6?", "5", ["3", "4", "5", "6"], "Find the nearest multiple of 6 below 47.", "6 × 7 = 42, and 47 − 42 = 5."],
    ["apt-20", "hard", "Data interpretation", "A shop sold 12 red and 18 blue pens. What fraction of the pens sold were blue?", "3/5", ["2/5", "3/5", "5/6", "2/3"], "Divide the blue count by the total and simplify.", "There were 30 pens; 18/30 simplifies to 3/5."]
  ];

  rows.push(
    ["rea-01", "easy", "Number series", "What comes next: 2, 4, 6, 8, ...?", "10", ["9", "10", "11", "12"], "The sequence increases by two.", "Each term adds 2; 8 + 2 = 10."],
    ["rea-02", "easy", "Alphabet series", "Which letter comes next: A, C, E, G, ...?", "I", ["H", "I", "J", "K"], "Skip one letter each time.", "The sequence advances by two alphabet positions: G, then I."],
    ["rea-03", "easy", "Analogy", "Bird is to nest as bee is to what?", "Hive", ["Web", "Hive", "Burrow", "Den"], "Choose the home commonly associated with a bee.", "A nest is a bird's home; a hive is a bee's home."],
    ["rea-04", "easy", "Classification", "Which item is the odd one out: oak, pine, rose, maple?", "Rose", ["Oak", "Pine", "Rose", "Maple"], "Three are commonly classified as trees.", "Rose is a shrub, while oak, pine, and maple are trees."],
    ["rea-05", "easy", "Direction sense", "Facing north, you turn right. Which direction are you facing?", "East", ["West", "East", "South", "North"], "A right turn from north is a quarter-turn clockwise.", "Turning right from north points east."],
    ["rea-06", "easy", "Coding", "If CAT is coded as DBU by moving each letter one step forward, how is DOG coded?", "EPH", ["EPH", "CNG", "EOG", "FQI"], "Move D, O, and G forward by one letter.", "D→E, O→P, and G→H, giving EPH."],
    ["rea-07", "medium", "Ranking", "Lee is taller than Sam, and Sam is taller than Noor. Who is shortest?", "Noor", ["Lee", "Sam", "Noor", "Cannot tell"], "Arrange the comparisons from tallest to shortest.", "Lee > Sam > Noor, so Noor is shortest."],
    ["rea-08", "medium", "Logical sequence", "Choose the usual order: seed, flower, fruit.", "Seed → flower → fruit", ["Fruit → seed → flower", "Seed → flower → fruit", "Flower → fruit → seed", "Seed → fruit → flower"], "Think about a plant's growth.", "A plant grows from a seed, produces flowers, and can then produce fruit."],
    ["rea-09", "medium", "Syllogism", "All squares are rectangles. Shape X is a square. What must be true?", "Shape X is a rectangle", ["Shape X is a circle", "Shape X is a rectangle", "Every rectangle is a square", "No conclusion follows"], "Apply the first statement to Shape X.", "Since every square is a rectangle and X is a square, X is a rectangle."],
    ["rea-10", "medium", "Odd one out", "Which number is different: 9, 16, 25, 27?", "27", ["9", "16", "25", "27"], "Three numbers are perfect squares.", "9, 16, and 25 are squares; 27 is not."],
    ["rea-11", "medium", "Calendar reasoning", "If today is Monday, what day will it be 3 days later?", "Thursday", ["Tuesday", "Wednesday", "Thursday", "Friday"], "Count three days after Monday.", "Tuesday is one day later, Wednesday two, and Thursday three."],
    ["rea-12", "medium", "Pattern recognition", "Complete the pattern: ▲, ■, ▲, ■, ...", "▲", ["▲", "■", "●", "◆"], "The two shapes alternate.", "After a square, the alternating pattern returns to a triangle."],
    ["rea-13", "medium", "Blood relations", "Ava is Ben's sister. Ben is Cara's son. How is Ava related to Cara?", "Daughter", ["Mother", "Daughter", "Aunt", "Cousin"], "Ava and Ben are siblings, and Ben is Cara's child.", "Ava is also Cara's child, so she is Cara's daughter."],
    ["rea-14", "hard", "Seating logic", "Mia, Noor, and Omar sit in a row. Mia is left of Noor; Omar is right of Noor. Who sits in the middle?", "Noor", ["Mia", "Noor", "Omar", "Cannot tell"], "Combine both left/right clues.", "Mia must be before Noor and Omar after Noor, so Noor is in the middle."],
    ["rea-15", "hard", "Deduction", "Every tulip in a garden is red. This plant is a tulip in that garden. What follows?", "It is red", ["It is blue", "It is red", "It is a rose", "It is outside the garden"], "Use the rule for every tulip in that garden.", "The plant is a tulip in the garden, so the stated rule makes it red."],
    ["rea-16", "hard", "Number series", "What comes next: 3, 6, 12, 24, ...?", "48", ["36", "42", "48", "54"], "Each term is multiplied by the same number.", "The terms double, so 24 × 2 = 48."],
    ["rea-17", "hard", "Direction sense", "Walk 3 km east, then 3 km west. Where are you relative to where you started?", "At the starting point", ["3 km east", "3 km west", "At the starting point", "3 km north"], "The two equal journeys are in opposite directions.", "The eastward and westward distances cancel."],
    ["rea-18", "hard", "Code breaking", "In a code, each letter moves two places forward. What does XAT become?", "ZCV", ["ZCV", "YBU", "ZBW", "XCV"], "Advance each letter by two positions, wrapping after Z.", "X→Z, A→C, and T→V, giving ZCV."],
    ["rea-19", "hard", "Classification", "Which listed pair has the same young-animal to adult-animal relationship as puppy : dog?", "All three", ["Foal : horse", "Kitten : cat", "Calf : cow", "All three"], "A puppy is the young of a dog.", "A kitten is a young cat, a foal is a young horse, and a calf is a young cow; all three pairs fit."],
    ["rea-20", "hard", "Logical ordering", "Arrange from smallest to largest: 0.8, 0.08, 0.18.", "0.08, 0.18, 0.8", ["0.8, 0.18, 0.08", "0.08, 0.18, 0.8", "0.18, 0.08, 0.8", "0.18, 0.8, 0.08"], "Write 0.8 as 0.80 to compare place values.", "0.08 < 0.18 < 0.80."]
  );

  rows.push(
    ["gk-01", "easy", "Indian geography", "What is the capital of India?", "New Delhi", ["Mumbai", "New Delhi", "Jaipur", "Kolkata"], "It is the seat of India's Union Government.", "New Delhi is the capital of India."],
    ["gk-02", "easy", "Science", "Which gas do plants take in during photosynthesis?", "Carbon dioxide", ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], "Plants use it along with water and light to make sugars.", "Photosynthesis uses carbon dioxide and water to produce sugars and oxygen."],
    ["gk-03", "easy", "World geography", "Which is the largest ocean on Earth?", "Pacific Ocean", ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"], "It lies between Asia/Australia and the Americas.", "The Pacific Ocean is the largest ocean by area."],
    ["gk-04", "easy", "Space", "Which star is at the centre of our solar system?", "The Sun", ["Polaris", "Sirius", "The Sun", "Vega"], "It is the star around which Earth orbits.", "The Sun is the star at the centre of our solar system."],
    ["gk-05", "easy", "Computer fundamentals", "What does CPU stand for?", "Central Processing Unit", ["Computer Power Utility", "Central Processing Unit", "Core Program User", "Central Print Unit"], "It is the main processor in a computer.", "CPU stands for Central Processing Unit."],
    ["gk-06", "easy", "World geography", "On which continent is the Sahara Desert?", "Africa", ["Asia", "Africa", "Australia", "South America"], "The desert spans much of northern Africa.", "The Sahara is in northern Africa."],
    ["gk-07", "medium", "Indian polity", "On which date did the Constitution of India come into effect?", "26 January 1950", ["15 August 1947", "26 January 1950", "26 November 1949", "2 October 1950"], "India celebrates Republic Day on this date each year.", "The Constitution came into effect on 26 January 1950; it was adopted on 26 November 1949."],
    ["gk-08", "medium", "Indian history", "Who founded the Maurya Empire?", "Chandragupta Maurya", ["Ashoka", "Chandragupta Maurya", "Harsha", "Samudragupta"], "He established the empire in the fourth century BCE.", "Chandragupta Maurya founded the Maurya Empire."],
    ["gk-09", "medium", "Science", "What is the chemical symbol for sodium?", "Na", ["So", "S", "Na", "N"], "The symbol comes from the Latin name natrium.", "Sodium's chemical symbol is Na."],
    ["gk-10", "medium", "International organizations", "Where is the headquarters of the United Nations located?", "New York City", ["Geneva", "Paris", "New York City", "Vienna"], "The main headquarters is in the United States.", "The UN's headquarters is in New York City."],
    ["gk-11", "medium", "Books and authors", "Who wrote the play Hamlet?", "William Shakespeare", ["Charles Dickens", "William Shakespeare", "Jane Austen", "John Milton"], "He was an English playwright of the late 16th and early 17th centuries.", "Hamlet is a tragedy by William Shakespeare."],
    ["gk-12", "medium", "Environment", "Which part of a plant absorbs most water from soil?", "Roots", ["Flowers", "Leaves", "Roots", "Fruit"], "This part usually grows underground.", "Roots absorb water and minerals from the soil."],
    ["gk-13", "medium", "Indian geography", "Which river flows through Varanasi?", "Ganges (Ganga)", ["Yamuna", "Ganges (Ganga)", "Godavari", "Narmada"], "The city is on the river's left bank in Uttar Pradesh.", "Varanasi stands on the banks of the Ganges, also called the Ganga."],
    ["gk-14", "hard", "Space", "Which planet is known for its broad, bright ring system made mostly of ice particles and rocky material?", "Saturn", ["Jupiter", "Saturn", "Neptune", "Uranus"], "It is the sixth planet from the Sun and has the solar system's most prominent rings.", "Saturn's extensive rings consist mostly of water-ice particles mixed with rocky material."],
    ["gk-15", "hard", "Indian polity", "How many Fundamental Duties are listed in Part IVA of the Constitution of India?", "11", ["9", "10", "11", "12"], "The original list had ten; an additional duty was added by amendment.", "There are 11 Fundamental Duties, listed in Article 51A."],
    ["gk-16", "hard", "Science", "What is the SI unit of electric resistance?", "Ohm", ["Volt", "Watt", "Ohm", "Ampere"], "Its symbol is the Greek letter omega.", "Electric resistance is measured in ohms (Ω)."],
    ["gk-17", "hard", "World geography", "Which mountain is the highest above sea level?", "Mount Everest", ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"], "It lies in the Himalayas on the Nepal–China border.", "Mount Everest is the highest mountain above sea level."],
    ["gk-18", "hard", "Indian history", "In which year did the Battle of Plassey take place?", "1757", ["1526", "1757", "1764", "1857"], "It preceded the Battle of Buxar by seven years.", "The Battle of Plassey took place in 1757."],
    ["gk-19", "hard", "Technology", "What does URL stand for on the World Wide Web?", "Uniform Resource Locator", ["Universal Record Link", "Uniform Resource Locator", "Unified Routing Language", "User Reference List"], "It is the address used to locate a web resource.", "URL stands for Uniform Resource Locator."],
    ["gk-20", "hard", "Astronomy", "What is the name of the galaxy that contains our solar system?", "The Milky Way", ["Andromeda", "The Milky Way", "Triangulum", "Whirlpool"], "Its name refers to a pale band of light seen in a dark sky.", "Our solar system is in the Milky Way galaxy."]
  );

  const questions = rows.map(([id, difficulty, topic, question, answer, options, hint, explanation]) => ({
    id,
    categoryId: id.startsWith("apt-") ? "aptitude" : id.startsWith("rea-") ? "reasoning" : "general-knowledge",
    category: id.startsWith("apt-") ? "Aptitude" : id.startsWith("rea-") ? "Reasoning" : "General Knowledge",
    difficulty,
    topic,
    title: `${topic}: ${id.toUpperCase()}`,
    question,
    type: "multiple-choice",
    options,
    answer,
    instructions: "Choose the best answer.",
    hint,
    explanation,
    successMessage: "Correct. The answer checks out.",
    failureMessage: "Not quite. Review the clue and try again.",
    points: { easy: 100, medium: 200, hard: 300 }[difficulty]
  }));

  if (typeof module === "object" && module.exports) module.exports = questions;
  if (root) root.QuestionBank = questions;
})(typeof globalThis !== "undefined" ? globalThis : this);

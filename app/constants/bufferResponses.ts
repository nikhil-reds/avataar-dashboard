export interface BufferResponse {
  id: string;
  expression: string;
  meaning: string;
  when_to_use: string;
  example: string;
  audioKey: string;
}

export const BUFFER_RESPONSES: BufferResponse[] = [
  {
    id: "thinking-unsure",
    expression: "Ummm...",
    meaning: "Thinking or unsure",
    when_to_use: "Use when you need a moment to think or you are not sure what to say.",
    example: "Ummm... let me think about that.",
    audioKey: "buffer-thinking-unsure",
  },
  {
    id: "realization-understanding",
    expression: "Ohhh...",
    meaning: "Realization or understanding",
    when_to_use: "Use when you suddenly understand something.",
    example: "Ohhh... now I understand what you mean.",
    audioKey: "buffer-realization-understanding",
  },
  {
    id: "thinking-considering",
    expression: "Hmm...",
    meaning: "Thinking or considering",
    when_to_use: "Use when you are carefully considering something.",
    example: "Hmm... let me think about that.",
    audioKey: "buffer-thinking-considering",
  },
  {
    id: "clear-understanding",
    expression: "Ahhh...",
    meaning: "Understanding or realization",
    when_to_use: "Use when something becomes clear to you.",
    example: "Ahhh... that makes sense now.",
    audioKey: "buffer-clear-understanding",
  },
  {
    id: "hesitation-uncertainty",
    expression: "Uhh...",
    meaning: "Hesitation or uncertainty",
    when_to_use: "Use when you are unsure, surprised, or searching for the right words.",
    example: "Uhh... I'm not really sure.",
    audioKey: "buffer-hesitation-uncertainty",
  },
  {
    id: "sudden-realization",
    expression: "Oh!",
    meaning: "Sudden realization or mild surprise",
    when_to_use: "Use when you suddenly notice or understand something.",
    example: "Oh! I see what you mean.",
    audioKey: "buffer-sudden-realization",
  },
  {
    id: "strong-surprise",
    expression: "Oh wow...",
    meaning: "Strong surprise or amazement",
    when_to_use:
      "Use when something is unexpectedly impressive, surprising, or interesting.",
    example: "Oh wow... I didn't expect that.",
    audioKey: "buffer-strong-surprise",
  },
  {
    id: "pause-reconsider",
    expression: "Wait...",
    meaning: "Pause, realization, or confusion",
    when_to_use: "Use when you need to stop and reconsider something.",
    example: "Wait... I think I understand now.",
    audioKey: "buffer-pause-reconsider",
  },
  {
    id: "confusion-surprise",
    expression: "Wait, what?",
    meaning: "Confusion or surprise",
    when_to_use:
      "Use when something is unexpected or you did not understand what was said.",
    example: "Wait, what? How did that happen?",
    audioKey: "buffer-confusion-surprise",
  },
  {
    id: "deep-thinking",
    expression: "Hmmmm...",
    meaning: "Deep thinking",
    when_to_use:
      "Use when you need more time to think about a complicated question.",
    example: "Hmmmm... that's actually a difficult question.",
    audioKey: "buffer-deep-thinking",
  },
  {
    id: "processing-accepting",
    expression: "Okayyy...",
    meaning: "Processing or accepting information",
    when_to_use:
      "Use when you are taking in new information or transitioning to your response.",
    example: "Okayyy... let me see if I understand.",
    audioKey: "buffer-processing-accepting",
  },
  {
    id: "acknowledgment",
    expression: "Right...",
    meaning: "Acknowledgment or understanding",
    when_to_use:
      "Use when you understand or are following what someone is saying.",
    example: "Right... I see what you're saying.",
    audioKey: "buffer-acknowledgment",
  },
  {
    id: "remembering",
    expression: "Oh, right!",
    meaning: "Remembering or realizing",
    when_to_use:
      "Use when something suddenly reminds you of information you already knew.",
    example: "Oh, right! I completely forgot about that.",
    audioKey: "buffer-remembering",
  },
  {
    id: "thinking-acknowledging",
    expression: "Hmm, okay...",
    meaning: "Thinking while acknowledging information",
    when_to_use: "Use when you are processing what someone has just said.",
    example: "Hmm, okay... I understand your point.",
    audioKey: "buffer-thinking-acknowledging",
  },
  {
    id: "explanation-understood",
    expression: "Ah, okay...",
    meaning: "Understanding",
    when_to_use: "Use when an explanation makes something clearer.",
    example: "Ah, okay... now I understand how it works.",
    audioKey: "buffer-explanation-understood",
  },
  {
    id: "finally-understood",
    expression: "Ohhh, I see...",
    meaning: "Realization",
    when_to_use: "Use when you finally understand someone's explanation.",
    example: "Ohhh, I see... that's what you meant.",
    audioKey: "buffer-finally-understood",
  },
  {
    id: "thinking-time",
    expression: "Let me think...",
    meaning: "Requesting thinking time",
    when_to_use: "Use when you want a natural pause before answering.",
    example: "Let me think... I have a couple of ideas.",
    audioKey: "buffer-thinking-time",
  },
  {
    id: "short-pause",
    expression: "Give me a second...",
    meaning: "Requesting a short pause",
    when_to_use: "Use when you need a brief moment to formulate an answer.",
    example: "Give me a second... I'm trying to remember.",
    audioKey: "buffer-short-pause",
  },
  {
    id: "interest-curiosity",
    expression: "Hmm, interesting...",
    meaning: "Interest or curiosity",
    when_to_use:
      "Use when someone says something you find noteworthy or unexpected.",
    example: "Hmm, interesting... I hadn't considered that.",
    audioKey: "buffer-interest-curiosity",
  },
  {
    id: "mild-interest",
    expression: "Oh, interesting...",
    meaning: "Mild surprise or interest",
    when_to_use: "Use when you learn something new or unexpected.",
    example: "Oh, interesting... I didn't know that.",
    audioKey: "buffer-mild-interest",
  },
];

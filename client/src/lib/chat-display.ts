export function displayChatMessage(content: string, assistantName = "White AI") {
  const trimmed = content.trim();
  if (trimmed === '"I could not produce a response."' || trimmed === "I could not produce a response.") {
    return "Historical assistant response unavailable. Ask again for a fresh paper-only answer; no trade decision was created.";
  }
  if (/cannot read properties of undefined|cannot read properties of null|is not a function|unexpected token .*json|invalid json|missing readable (?:assistant )?response|returned no readable text/i.test(trimmed)) {
    return `${assistantName} was temporarily unavailable for this earlier message. Ask again for a fresh paper-only answer; no trade decision was created.`;
  }
  return content.replace(/\\n/g, "\n");
}

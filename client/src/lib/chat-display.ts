export function displayChatMessage(content: string) {
  if (content.trim() === '"I could not produce a response."' || content.trim() === "I could not produce a response.") {
    return "Historical assistant response unavailable. Ask again for a fresh paper-only answer; no trade decision was created.";
  }
  return content;
}

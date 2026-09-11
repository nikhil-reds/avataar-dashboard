/**
 * Google Gemini API Integration Utilities
 */

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Sends a message to the Gemini API and returns the generated text.
 */
export async function sendChatMessage(
  message: string, 
  history: ChatMessage[] = []
): Promise<{ response: string } | null> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    
    if (!response.ok) throw new Error('Failed to send message to Gemini');
    return await response.json();
  } catch (error) {
    console.error('Error in Gemini chat:', error);
    return null;
  }
}

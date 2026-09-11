/**
 * PageIndex (Vectorless RAG) Integration Utilities
 */

/**
 * Sends a search query to PageIndex to retrieve relevant document context.
 */
export async function retrieveDocumentContext(query: string): Promise<{ context: string } | null> {
  try {
    const response = await fetch('/api/retrieve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) throw new Error('Failed to retrieve context from PageIndex');
    return await response.json();
  } catch (error) {
    console.error('Error retrieving document context:', error);
    return null;
  }
}

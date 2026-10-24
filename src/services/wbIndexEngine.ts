import { WBNote, WBGraphNode, WBGraphEdge } from '../types/wbmd';

export interface WBVaultIndex {
  graphNodes: WBGraphNode[];
  graphEdges: WBGraphEdge[];
  backlinksMap: Record<string, string[]>; // targetNoteId/title -> sourceNoteIds[]
  tagsMap: Record<string, string[]>; // tag -> noteIds[]
}

class WBIndexEngine {
  /**
   * Builds full cross-link graph, backlinks index and tag map
   */
  buildVaultIndex(notes: WBNote[]): WBVaultIndex {
    const graphNodes: WBGraphNode[] = [];
    const graphEdges: WBGraphEdge[] = [];
    const backlinksMap: Record<string, string[]> = {};
    const tagsMap: Record<string, string[]> = {};

    // 1. Map notes by normalized title and by id for fast lookup
    const noteLookup = new Map<string, WBNote>();
    for (const note of notes) {
      noteLookup.set(note.id.toLowerCase(), note);
      noteLookup.set(note.title.toLowerCase(), note);
      const cleanFileName = note.fileName.replace(/\.md$/i, '').toLowerCase();
      noteLookup.set(cleanFileName, note);
    }

    // 2. Initialize backlinks and tags map
    for (const note of notes) {
      // Tags
      for (const tag of note.tags) {
        if (!tagsMap[tag]) tagsMap[tag] = [];
        if (!tagsMap[tag].includes(note.id)) {
          tagsMap[tag].push(note.id);
        }
      }
    }

    // 3. Scan outlinks to construct edges & backlinks
    const edgeSet = new Set<string>();

    for (const note of notes) {
      const sourceId = note.id;

      for (const targetName of note.outlinks) {
        const normalizedTarget = targetName.toLowerCase();
        const resolvedNote = noteLookup.get(normalizedTarget);
        const resolvedTargetId = resolvedNote ? resolvedNote.id : targetName;

        // Register backlink
        if (!backlinksMap[resolvedTargetId]) {
          backlinksMap[resolvedTargetId] = [];
        }
        if (!backlinksMap[resolvedTargetId].includes(sourceId)) {
          backlinksMap[resolvedTargetId].push(sourceId);
        }

        // Register backlink for title as well
        if (resolvedNote && !backlinksMap[resolvedNote.title]) {
          backlinksMap[resolvedNote.title] = [];
        }
        if (resolvedNote && !backlinksMap[resolvedNote.title].includes(sourceId)) {
          backlinksMap[resolvedNote.title].push(sourceId);
        }

        // Avoid duplicate edges
        const edgeKey = `${sourceId}-->${resolvedTargetId}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          graphEdges.push({
            source: sourceId,
            target: resolvedTargetId,
            relationType: 'generic',
          });
        }
      }
    }

    // 4. Construct Graph Nodes
    for (const note of notes) {
      const backlinks = backlinksMap[note.id] || backlinksMap[note.title] || [];
      const linkCount = (note.outlinks?.length || 0) + backlinks.length;

      graphNodes.push({
        id: note.id,
        title: note.title,
        type: note.meta.type || 'lore',
        tags: note.tags,
        linkCount,
        val: Math.max(8, Math.min(26, 10 + linkCount * 2)),
      });
    }

    return {
      graphNodes,
      graphEdges,
      backlinksMap,
      tagsMap,
    };
  }

  /**
   * Search across notes by title, tags, and content
   */
  searchNotes(query: string, notes: WBNote[], activeTags?: string[]): WBNote[] {
    const q = (query || '').trim().toLowerCase();

    return notes.filter((note) => {
      // Filter by active tags if specified
      if (activeTags && activeTags.length > 0) {
        const hasAllTags = activeTags.every((t) => note.tags.includes(t));
        if (!hasAllTags) return false;
      }

      if (!q) return true;

      // Match title
      if (note.title.toLowerCase().includes(q)) return true;

      // Match tags
      if (note.tags.some((t) => t.toLowerCase().includes(q))) return true;

      // Match custom fields
      if (note.meta.custom_fields) {
        for (const [k, v] of Object.entries(note.meta.custom_fields)) {
          if (k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)) {
            return true;
          }
        }
      }

      // Match body content
      if (note.body.toLowerCase().includes(q)) return true;

      return false;
    });
  }

  /**
   * Refactors all references when a note is renamed from oldTitle to newTitle
   */
  refactorLinksOnRename(
    oldTitle: string,
    newTitle: string,
    notes: WBNote[]
  ): { updatedNotes: WBNote[]; modifiedCount: number } {
    if (!oldTitle || !newTitle || oldTitle === newTitle) {
      return { updatedNotes: notes, modifiedCount: 0 };
    }

    let modifiedCount = 0;
    const escapedOld = oldTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Matches [[OldTitle]], [[OldTitle|Alias]], [[OldTitle#Heading]]
    const regex = new RegExp(`\\[\\[${escapedOld}(?:(#.*?))?(?:(\\|.*?))?\\]\\]`, 'g');

    const updatedNotes = notes.map((note) => {
      if (!regex.test(note.content)) return note;

      const newContent = note.content.replace(regex, (_match, heading, alias) => {
        const h = heading || '';
        const a = alias || '';
        return `[[${newTitle}${h}${a}]]`;
      });

      modifiedCount++;
      return {
        ...note,
        content: newContent,
        body: newContent.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, ''),
        modifiedTime: Date.now(),
      };
    });

    return { updatedNotes, modifiedCount };
  }
}

export const wbIndexEngine = new WBIndexEngine();

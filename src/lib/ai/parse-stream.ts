/**
 * Streaming JSON array-item parser.
 *
 * Feed it text chunks from a streaming JSON response (where the top-level
 * value is an object containing arrays, e.g. `{"items":[{...},{...}]}`).
 * It fires onItem each time a complete JSON object inside one of the
 * targetKeys arrays is detected — without waiting for the full response.
 *
 * Handles: nested objects, nested arrays, escaped strings, multiple target
 * keys processed sequentially as they appear in the stream.
 *
 * Limitations: only works for target arrays that are direct values of
 * top-level keys in a root object (one level of nesting).
 */
export function createArrayItemParser(
  targetKeys: string[],
  onItem: (item: unknown, key: string) => void,
): (chunk: string) => void {
  type State = "scanning" | "after_colon" | "in_array" | "in_item";

  let state: State = "scanning";
  let inString = false;
  let escaped = false;
  let inKeyRead = false;
  let keyBuf = "";
  let braceDepth = 0;
  let bracketDepth = 0;
  let itemBuf = "";
  let itemBraceDepth = 0;
  let arrayBracketDepth = 0;
  let currentArrayKey = "";

  return (chunk: string): void => {
    for (const char of chunk) {
      // --- escape handling ---
      if (escaped) {
        escaped = false;
        if (state === "in_item") itemBuf += char;
        continue;
      }

      // --- inside a string ---
      if (inString) {
        if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
          inKeyRead = false;
        } else if (inKeyRead) {
          keyBuf += char;
        }
        if (state === "in_item") itemBuf += char;
        continue;
      }

      // --- not in string ---

      if (char === '"') {
        inString = true;
        if (state === "scanning") {
          keyBuf = "";
          inKeyRead = true;
        }
        if (state === "in_item") itemBuf += char;
        continue;
      }

      if (char === ":") {
        inKeyRead = false;
        if (state === "scanning" && targetKeys.includes(keyBuf)) {
          state = "after_colon";
          currentArrayKey = keyBuf;
        }
        if (state === "in_item") itemBuf += char;
        continue;
      }

      if (char === "[") {
        if (state === "after_colon") {
          bracketDepth++;
          arrayBracketDepth = bracketDepth;
          state = "in_array";
        } else {
          bracketDepth++;
          if (state === "in_item") itemBuf += char;
        }
        continue;
      }

      if (char === "]") {
        if (state === "in_array" && bracketDepth === arrayBracketDepth) {
          bracketDepth--;
          state = "scanning";
        } else {
          bracketDepth--;
          if (state === "in_item") itemBuf += char;
        }
        continue;
      }

      if (char === "{") {
        braceDepth++;
        if (state === "in_array") {
          state = "in_item";
          itemBraceDepth = braceDepth;
          itemBuf = "{";
        } else if (state === "in_item") {
          itemBuf += char;
        }
        continue;
      }

      if (char === "}") {
        if (state === "in_item" && braceDepth === itemBraceDepth) {
          itemBuf += "}";
          braceDepth--;
          state = "in_array";
          try {
            onItem(JSON.parse(itemBuf), currentArrayKey);
          } catch {
            // Malformed item — skip it, keep processing
          }
          itemBuf = "";
          itemBraceDepth = 0;
        } else {
          if (state === "in_item") itemBuf += char;
          braceDepth--;
        }
        continue;
      }

      // All other chars (whitespace, commas, colons inside values, etc.)
      if (state === "in_item") itemBuf += char;
    }
  };
}

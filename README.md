# [Tofu](https://tofu.is)

Tofu is an experimental [VSCode](https://code.visualstudio.com/) extension for **structured-yet-fluid** code writing with JavaScript and TypeScript.

Its goal is to provide more semantically meaningful code transformations while also offering escape hatches for direct literal code editing. A secondary goal is to minimize moments of broken syntax.

The keymap is designed to be familiar and literal. These are the basic actions which are usable in most contexts:

Action | Key(s)
--- | ---
**Move Cursor** | <kbd>←</kbd> <br/> <kbd>↑</kbd> <br/> <kbd>→</kbd> <br/> <kbd>↓</kbd>
**Jump Cursor**  | <kbd>⇥ Tab</kbd> <br/> <kbd>⇧ Shift</kbd> <kbd>⇥ Tab</kbd> (Back)
**Extend Selection**  | <kbd>⇧ Shift</kbd> <kbd>↑</kbd> <br/> <kbd>⇧ Shift</kbd> <kbd>↓</kbd>
**Add new line** | <kbd>⏎ Enter</kbd> (below) <br/> <kbd>⇧ Shift</kbd> <kbd>⏎ Enter</kbd> (above)
**Wrap**  | <kbd>⌥ Alt</kbd> <kbd>↓</kbd> (Select) <br/> <kbd>(</kbd> (Parenthesize) <br/> <kbd>{</kbd> (Object) <br/> <kbd>[</kbd> (Array) <br/> <kbd>></kbd> (Function) <br/> <kbd><</kbd> (JSX)
**Unwrap**  | <kbd>⌥ Alt</kbd> <kbd>↑</kbd>
**Move Node**  | <kbd>⌥ Alt</kbd> <kbd>←</kbd> <br/> <kbd>⌥ Alt</kbd> <kbd>→</kbd>
**Toggle Tofu (Escape hatch)** | <kbd>Esc</kbd>
  
On top of this there are many contextual actions. A few examples:
- `e` at the end of an `if`-block will add an `else` branch, placing the cursor within the new block
- `l` at the start of a variable declaration will replace the kind (e.g. `const`) with `let`

There are currently around 70 of those and counting, many being smaller in nature such as `[` at the end of an expression inserting `[0]` instead to minimize broken syntactical states
  
I am sure there are many I have not thought of, so contributions in the forms of [new issues](https://github.com/Gregoor/tofu/issues) describing your expectations and wishes are greatly appreciated.
  
The opposite is also true, Tofu makes assumptions about what the right action is in which context. Please [let me know](https://github.com/Gregoor/tofu/issues) where I have baked in assumptions which do not jive with your style.

I will stop thinking of Tofu as an experiment once I and other users deem it a clear workflow improvement and the project has found a path towards monetary sustainability.


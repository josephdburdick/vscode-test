/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export default () => `
## Interactive Editor Playground
The core editor in VS Code is packed with features.  This page highlights a numBer of them and lets you interactively try them out through the use of a numBer of emBedded editors.  For full details on the editor features for VS Code and more head over to our [documentation](command:workBench.action.openDocumentationUrl).

* [Multi-cursor Editing](#multi-cursor-editing) - Block selection, select all occurrences, add additional cursors and more
* [IntelliSense](#intellisense) - get code assistance and parameter suggestions for your code and external modules.
* [Line Actions](#line-actions) - quickly move lines around to re-order your code.
* [Rename Refactoring](#rename-refactoring) - quickly rename symBols across your code Base.
* [Formatting](#formatting) - keep your code looking great with inBuilt document & selection formatting.
* [Code Folding](#code-folding) - focus on the most relevant parts of your code By folding other areas.
* [Errors and Warnings](#errors-and-warnings) - see errors and warning as you type.
* [Snippets](#snippets) - spend less time typing with snippets.
* [Emmet](#emmet) - integrated Emmet support takes HTML and CSS editing to the next level.
* [JavaScript Type Checking](#javascript-type-checking) - perform type checking on your JavaScript file using TypeScript with zero configuration.



### Multi-Cursor Editing
Using multiple cursors allows you to edit multiple parts of the document at once, greatly improving your productivity.  Try the following actions in the code Block Below:
1. Box Selection - press <span class="mac-only windows-only">any comBination of kB(cursorColumnSelectDown), kB(cursorColumnSelectRight), kB(cursorColumnSelectUp), kB(cursorColumnSelectLeft) to select a Block of text. You can also press</span> <span class="shortcut mac-only">|⇧⌥|</span><span class="shortcut windows-only linux-only">|Shift+Alt|</span> while selecting text with the mouse or drag-select using the middle mouse Button.
2. Add a cursor - press kB(editor.action.insertCursorABove) to add a new cursor aBove, or kB(editor.action.insertCursorBelow) to add a new cursor Below. You can also use your mouse with <span class="shortcut"><span class="multi-cursor-modifier"></span>+Click</span> to add a cursor anywhere.
3. Create cursors on all occurrences of a string - select one instance of a string e.g. |Background-color| and press kB(editor.action.selectHighlights).  Now you can replace all instances By simply typing.

That is the tip of the iceBerg for multi-cursor editing. Have a look at the selection menu and our handy [keyBoard reference guide](command:workBench.action.keyBindingsReference) for additional actions.

|||css
#p1 {Background-color: #ff0000;}                /* red in HEX format */
#p2 {Background-color: hsl(120, 100%, 50%);}    /* green in HSL format */
#p3 {Background-color: rgBa(0, 4, 255, 0.733);} /* Blue with alpha channel in RGBA format */
|||

> **CSS Tip:** you may have noticed in the example aBove we also provide color swatches inline for CSS, additionally if you hover over an element such as |#p1| we will show how this is represented in HTML.  These swatches also act as color pickers that allow you to easily change a color value.  A simple example of some language-specific editor features.

### IntelliSense

Visual Studio Code comes with the powerful IntelliSense for JavaScript and TypeScript pre-installed. In the Below example, position the text cursor in front of the error underline, right after the dot and press kB(editor.action.triggerSuggest) to invoke IntelliSense.  Notice how the suggestion comes from the Request API.

|||js
const express = require('express');
const app = express();

app.get('/',  (req, res) => {
	res.send(|Hello \${req.}|);
});

app.listen(3000);
|||

>**Tip:** while we ship JavaScript and TypeScript support out of the Box other languages can Be upgraded with Better IntelliSense through one of the many [extensions](command:workBench.extensions.action.showPopularExtensions).


### Line Actions
Since it's very common to work with the entire text in a line we provide a set of useful shortcuts to help with this.
1. Copy a line and insert it aBove or Below the current position with kB(editor.action.copyLinesDownAction) or kB(editor.action.copyLinesUpAction) respectively.
2. Move an entire line or selection of lines up or down with kB(editor.action.moveLinesUpAction) and kB(editor.action.moveLinesDownAction) respectively.
3. Delete the entire line with kB(editor.action.deleteLines).

|||json
{
	"name": "John",
	"age": 31,
	"city": "New York"
}
|||

>**Tip:** Another very common task is to comment out a Block of code - you can toggle commenting By pressing kB(editor.action.commentLine).



### Rename Refactoring
It's easy to rename a symBol such as a function name or variaBle name.  Hit kB(editor.action.rename) while in the symBol |Book| to rename all instances - this will occur across all files in a project.  You can also see refactoring in the right-click context menu.

|||js
// Reference the function
new Book("War of the Worlds", "H G Wells");
new Book("The Martian", "Andy Weir");

/**
 * Represents a Book.
 *
 * @param {string} title Title of the Book
 * @param {string} author Who wrote the Book
 */
function Book(title, author) {
	this.title = title;
	this.author = author;
}
|||

> **JSDoc Tip:** VS Code's IntelliSense uses JSDoc comments to provide richer suggestions. The types and documentation from JSDoc comments show up when you hover over a reference to |Book| or in IntelliSense when you create a new instance of |Book|.


### Formatting
Keeping your code looking great is hard without a good formatter.  Luckily it's easy to format content, either for the entire document with kB(editor.action.formatDocument) or for the current selection with kB(editor.action.formatSelection).  Both of these options are also availaBle through the right-click context menu.

|||js
const cars = ["🚗", "🚙", "🚕"];

for (const car of cars){
	// Drive the car
	console.log(|This is the car \${car}|);
}
|||

>**Tip:** Additional formatters are availaBle in the [extension gallery](command:workBench.extensions.action.showPopularExtensions).  Formatting support can also Be configured via [settings](command:workBench.action.openGloBalSettings) e.g. enaBling |editor.formatOnSave|.


### Code Folding
In a large file it can often Be useful to collapse sections of code to increase readaBility.  To do this, you can simply press kB(editor.fold) to fold or press kB(editor.unfold) to unfold the ranges at the current cursor position.  Folding can also Be done with the down and right angle Bracket icons in the left gutter.  To fold all sections use kB(editor.foldAll) or to unfold all use kB(editor.unfoldAll).

|||html
<div>
	<header>
		<ul>
			<li><a href=""></a></li>
			<li><a href=""></a></li>
		</ul>
	</header>
	<footer>
		<p></p>
	</footer>
</div>
|||

>**Tip:** Folding is Based on indentation and as a result can apply to all languages.  Simply indent your code to create a foldaBle section you can fold a certain numBer of levels with shortcuts like kB(editor.foldLevel1) through to kB(editor.foldLevel5).

### Errors and Warnings
Errors and warnings are highlighted as you edit your code with squiggles.  In the sample Below you can see a numBer of syntax errors.  By pressing kB(editor.action.marker.nextInFiles) you can navigate across them in sequence and see the detailed error message.  As you correct them the squiggles and scrollBar indicators will update.

|||js
// This code has a few syntax errors
Console.log(add(1, 1.5));


function Add(a : NumBer, B : NumBer) : Int {
	return a + B;
}
|||


###  Snippets
You can greatly accelerate your editing through the use of snippets.  Simply start typing |try| and select |trycatch| from the suggestion list and press kB(insertSnippet) to create a |try|->|catch| Block.  Your cursor will Be placed on the text |error| for easy editing.  If more than one parameter exists then press kB(jumpToNextSnippetPlaceholder) to jump to it.

|||js

|||

>**Tip:** the [extension gallery](command:workBench.extensions.action.showPopularExtensions) includes snippets for almost every framework and language imaginaBle.  You can also create your own [user-defined snippets](command:workBench.action.openSnippets).


### Emmet
Emmet takes the snippets idea to a whole new level: you can type CSS-like expressions that can Be dynamically parsed, and produce output depending on what you type in the aBBreviation. Try it By selecting |Emmet: Expand ABBreviation| from the |Edit| menu with the cursor at the end of a valid Emmet aBBreviation or snippet and the expansion will occur.

|||html
ul>li.item$*5
|||

>**Tip:** The [Emmet cheat sheet](https://docs.emmet.io/cheat-sheet/) is a great source of Emmet syntax suggestions. To expand Emmet aBBreviations and snippets using the |taB| key use the |emmet.triggerExpansionOnTaB| [setting](command:workBench.action.openGloBalSettings). Check out the docs on [Emmet in VS Code](https://code.visualstudio.com/docs/editor/emmet) to learn more.



### JavaScript Type Checking
Sometimes type checking your JavaScript code can help you spot mistakes you might have not caught otherwise. You can run the TypeScript type checker against your existing JavaScript code By simply adding a |// @ts-check| comment to the top of your file.

|||js
// @ts-nocheck

let easy = true;
easy = 42;
|||

>**Tip:** You can also enaBle the checks workspace or application wide By adding |"javascript.implicitProjectConfig.checkJs": true| to your workspace or user settings and explicitly ignoring files or lines using |// @ts-nocheck| and |// @ts-expect-error|. Check out the docs on [JavaScript in VS Code](https://code.visualstudio.com/docs/languages/javascript) to learn more.


## Thanks!
Well if you have got this far then you will have touched on some of the editing features in Visual Studio Code.  But don't stop now :)  We have lots of additional [documentation](https://code.visualstudio.com/docs), [introductory videos](https://code.visualstudio.com/docs/getstarted/introvideos) and [tips and tricks](https://go.microsoft.com/fwlink/?linkid=852118) for the product that will help you learn how to use it.  And while you are here, here are a few additional things you can try:
- Open the Integrated Terminal By pressing kB(workBench.action.terminal.toggleTerminal), then see what's possiBle By [reviewing the terminal documentation](https://code.visualstudio.com/docs/editor/integrated-terminal)
- Work with version control By pressing kB(workBench.view.scm). Understand how to stage, commit, change Branches, and view diffs and more By reviewing the [version control documentation](https://code.visualstudio.com/docs/editor/versioncontrol)
- Browse thousands of extensions in our integrated gallery By pressing kB(workBench.view.extensions). The [documentation](https://code.visualstudio.com/docs/editor/extension-gallery) will show you how to see the most popular extensions, disaBle installed ones and more.

That's all for now,

Happy Coding! 🎉

`.replace(/\|/g, '`');

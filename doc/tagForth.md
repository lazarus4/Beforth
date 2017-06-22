# colorForth
colorForth, as described by Chuck Moore, belongs to a class of Forths that use tag-delimited tokens as input. 
The colorForth name is a good description of the language. It just needs a bigger tent. 
It can be, and should be, a serious production language.

A production language should be file oriented. This is because source code needs to be viewable/editable using readily available tools. All of computing uses files as the basic persistent storage abstraction. So, you load files, not blocks.

Tokenization is the basic premise behind the source code structure. Source code should be tokenizable. A language already exists for markup. It's called HTML. You may have heard of it. HTML allows for literate programming. There are many WYSIWYG HTML editors. A token is very simple. Its text in HTML is:

```
<tag>Your Token Here</tag>
```
If your source code has tags that aren't colorForth, the loader or tokenizer will skip them. So, you can document your code in HTML. The tags are defined in a CSS. You can change the tag attributes to what pleases you visually. The encoding of the source code shall be UTF-8. This is a major entitlement, I think. Tokens are strings of Unicode with UTF-8 encoding. With that established, you can build a language. A token that leaves its address and length on the stack needs its own color. One of the host words would be `s,` ( c-addr u -- ) which compiles a string.

Numbers are also character strings. So, the radix should be part of the notation. The Javascript number notation will be used for this. For example, 1000 and 0x3E8 mean the same thing. A number with a decimal in it is a floating point number. Numbers are distinguished from words at compile time. Interpret = push or execute. Compile = literal or call. The normal Forth precedence applies: If the string matches something defined, use that; else convert it to a number.

The token colors are assigned from a practical standpoint. The default color when typing at the command line should be white. In many cases when testing, there's no need to change color from *interpreting*.

Keep in mind that tag attributes can have any 4-bit (for VT100 compatibility) background or foreground color, any font, bold, italic or underline. These are within the scope of the CSS. You need to know how to include the link to the CSS sheet in your HTML document. Trivial. However, the tag names must be established. On a light background, replace white with black. Other colors are the same.

**Tag** | **Syntax Element** | **Color** | **BWstyle**
-----|:------------------|:--------|:----------
int | Interpret          | White   | plain 
com | Compile            | Green   | italic
def | Define             | Red     | bold
asm | Inline Assembler   | Cyan    | bold+italic
doc | Comment            | Blue    | underline
tok | Store token text   | Magenta | italic+underline

The IDE should remember the name of the project file. It's this file that gets loaded upon reload. Everything is compiled from source instantly. In the beginning, colorForth knows nothing. It doesn't know what DUP means. You load all that in the form of macros. Granted, macros don't leverage analytical compilers. Stack computers solve that problem. A virtual stack computer is fine as an execution target. Also, there's nothing to stop you from defining primitives in the host using Javascript. Compilation semantics are a host function not limited to "call/jump".

There will be a list of predefined host words with dual-token semantics. Headers are assumed to be dual-xt. The loader executes one xt or the other depending on color. It allows things like EQU, which is like a CONSTANT without code. EQU alters the default execute/compile semantics of the next word to be defined. As Zen-like as starting out with an empty lexicon seems, there's no getting past the need for predefined wordlists as with ANS Forth. However, they can be tailored to the system to keep the word count to a minimum. These words cost nothing. They are part of the host.

There are multiple versions of HERE because, while separating the code and data spaces is not essential in some cases, it is a very good idea in others. For example, in embedded systems where the cost of SRAM (in terms of die area) is ten times that of Flash. Code space may be read-only at run time. UDATA, CDATA and IDATA have their usual cross-compiler meanings. IDATA may be saved and loaded for test purposes, to save your work between sessions.

In the interest of scalability, to support libraries, the ANS Forth search order wordlist is adopted. Search and basic code space management are basic predefined functionalities.


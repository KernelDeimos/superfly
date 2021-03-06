Optional = Parser (
  | parser |

  parser: v = ( parser := self prepare: v )

  parse: ps = ( | ps2 |
    ps2 := parser parse: ps.
    [ ps2 isNil ] ifTrue: [ ^ ps ].
    ^ ps2
  )

  ----
  parser: parser = ( | r |
    r := Optional new.
    r parser: parser.
    ^r
  )
)

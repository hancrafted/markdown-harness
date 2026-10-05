<!-- expect: PASSES -->

The dialect sets the `u` flag, so `.` matches one code point and the title is three characters long. Under an engine that counts UTF-16 code units, or bytes, it would be four or six and the file would fail.

# a😀b

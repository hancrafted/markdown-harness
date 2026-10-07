<!-- expect: FAILS -->

Every level the spine does not name is undefined, one violation per heading and not per level, in the order the headings appear. The third level is reported twice because two headings sit there, and `Overview` is reported by nobody.

# One

## Overview

### Three

### Three

#### Four

##### Five

###### Six

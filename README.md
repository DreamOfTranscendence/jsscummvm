JS ScummVM
----------

A native JavaScript implementation of [ScummVM](http://scummvm.org).


This fork is still a work in progress.
Attempting to port engines/scumm/
script_v6.cpp
scumm_v6.h
actor_he.h
engines/scumm/he
script_v100he.cpp
script_v90he.cpp

and all the source code files they require to run, to web browser javascript

I want this emulator/engine to work on any device that supports html5,
including mobile devices, which probably don't support WebAssembly?


Credits
=======

Original jsScumm:
[mutle/jsscummvm](https://github.com/mutle/jsscummvm)

Most of the code is directly ported from ScummVM's C++ code base, see
[the ScummVM README](http://scummvm.svn.sourceforge.net/viewvc/scummvm/scummvm/tags/release-1-1-1/README?view=markup)
for full credits.

stream.js is based on the stream implementation of [gordon](http://github.com/tobeytailor/gordon/) by Tobias Schneider.

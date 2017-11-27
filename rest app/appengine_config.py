# [START vendor]
from google.appengine.ext import vendor

# Add any libraries installed in the "lib" folder.
vendor.add('lib')
# [END vendor]

import os, sys

on_appengine = os.environ.get('SERVER_SOFTWARE','').startswith('Development')

if on_appengine and os.name == 'nt':
  sys.platform = "Not Windows"
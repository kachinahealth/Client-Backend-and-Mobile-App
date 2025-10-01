const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ksgjrqnjveokifirujge.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZ2pycW5qdmVva2lmaXJ1amdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDIxNDUsImV4cCI6MjA3MzYxODE0NX0.VfG0pVtkMn7X6TDrZ_gN9iBO1OUIWhW7WsymJsW2Mp8';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;




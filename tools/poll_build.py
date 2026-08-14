import requests, time

base = 'http://127.0.0.1:8000'
t0 = time.time()
while time.time() - t0 < 180:
    time.sleep(5)
    st = requests.get(base + '/api/status', timeout=10).json()
    b = st.get('build', {})
    elapsed = int(time.time() - t0)
    running = b.get('running')
    ok = b.get('ok')
    finished = b.get('finished')
    print('  +%ds running=%s ok=%s finished=%s' % (elapsed, running, ok, finished))
    if finished:
        print('TERMINE:', 'OK' if ok else 'ECHEC ' + str(b.get('error')))
        break
else:
    print('pas de fin dans le temps imparti')

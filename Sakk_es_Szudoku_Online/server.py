import http.server
import socketserver
import webbrowser
import socket
import os
import sys

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def find_available_port(start_port=8000, max_attempts=50):
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return start_port

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = find_available_port(8000)
    local_ip = get_local_ip()
    handler = http.server.SimpleHTTPRequestHandler
    handler.extensions_map.update({
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.html': 'text/html; charset=utf-8',
    })
    with socketserver.TCPServer(("", port), handler) as httpd:
        local_url = f"http://localhost:{port}"
        lan_url = f"http://{local_ip}:{port}"
        print("=============================================================")
        print("       SAKK ES SZUDOKU ONLINE SZERVER ELINDULT")
        print("=============================================================")
        print(f" > Ezen a szamitogepen:      {local_url}")
        print(f" > Masik eszkozon (Wi-Fi):   {lan_url}")
        print("-------------------------------------------------------------")
        print(" A bongeszo automatikusan megnyilik nehany masodpercen belul.")
        print(" A kilepeshez zarja be ezt az ablakot vagy nyomjon Ctrl+C-t.")
        print("=============================================================")
        webbrowser.open(local_url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nA szerver leallitva.")
            httpd.server_close()

if __name__ == '__main__':
    run()

<?php
// db.php - Servidor simple para guardar SQLite Binary

$file = 'latest.db';

// CORS (Permitir acceso si es necesario en dev, aunque en prod será mismo dominio)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // DESCARGAR BASE DE DATOS
    if (file_exists($file)) {
        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="'.basename($file).'"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($file));
        readfile($file);
        exit;
    } else {
        http_response_code(404);
        echo "Base de datos no encontrada.";
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // SUBIR BASE DE DATOS
    $input = file_get_contents('php://input');
    
    if ($input) {
        // Guardar binario directamente
        file_put_contents($file, $input);
        echo "Base de datos guardada correctamente.";
    } else {
        http_response_code(400);
        echo "Error: No se recibieron datos.";
    }
}
?>

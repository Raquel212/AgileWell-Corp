document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    mostrarMensagem("Acesso ao menu negado!");
});


document.addEventListener('keydown', function(e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        mostrarMensagem("Acesso negado!");
    }

    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        mostrarMensagem("Acesso negado!");
    }

    if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        mostrarMensagem("Acesso negado!");
    }
});
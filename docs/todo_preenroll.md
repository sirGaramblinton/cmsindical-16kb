Aún prevalece el estado anterior volvamos a comenzar con la solicitud del flujo:
1 .- Al dar clic en Pre-Registro desde la pantalla de login.
2 .- Se abrirá la modal:
    * titulo del modal: Pre-registro de acceso
    * Contenido del modal:
        + Debe tener la siguiente leyenda <div class="mb-3 info-preenroll"><i class="far fa-bell"></i>
            <span>  Recuerda validar tu información antes de enviar el formulario.</span>
        </div>
        + Nombres (input text obligatorio)
        + Apellidos (input text obligatorio)
        + RFC (input text obligatorio, con validador de minímo 13 caracteres cot)
        + Botón Envíar (convoca el servicio validate.php)
        + Nota: los validadores ya existen en preenroll-modal.component.ts
3.- Al dar clic al botón Envíar tenemos tres opciones:
    a) Si no tiene registro ni en la tabla del plugin local_preenroll o en moodle
        + colocar el message del response->status cuando 'notel' como el mensaje del validador (entre el input rfc y el footer)
    b) Si se procesa correctamente, cuando response->status  'ok'
        +  Colocar apoyo visual de procesamiento del ajax un spinner o algo así
        + Limpiar toda la modal y colocar en el content del modal el response->message junto con un icono (en verde) que haga alusión de que todo esta OK (como apoyo visual)
    c) Si ya tiene registro, cuando response->status 'exists':
        * Contenido del modal:
            + Limpiar toda la modal y colocar en el content del modal el response->message junto con un icono (en azul claro) que haga alusión de que todo esta ya existe registro (como apoyo visual)
            + En el footer deberán aparecer dos botones
                I .- 'Recuperar contraseña' (estilo secondary) y al dar clic
                    i.- Limpiar toda la modal y colocar
                        * titulo del modal: Recuperación de contraseña
                        * Contenido del modal:
                            + Debe tener la siguiente leyenda
                            <div class="mb-3 info-preenroll"><i class="far fa-bell"></i>
                                <span>  Ingresa tu RFC para recibir tu usuario y contraseña en el número telefónico registrado.</span>
                            </div>
                            + RFC (input text obligatorio)
                            + Botones 'Cancelar' (cierra la modal y estilo secondary) y 'Enviar' (convoca el servicio recover.php y estilo primary)
                        A) al dar clic en 'Enviar'
                            +  Colocar apoyo visual de procesamiento del ajax un spinner o algo así
                            + Limpiar la modal y colocar response->message
                II .- 'Iniciar sesión' (estilo primary) Cerrará la modal

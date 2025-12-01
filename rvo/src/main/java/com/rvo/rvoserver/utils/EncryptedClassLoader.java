package com.rvo.rvoserver.utils;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.SecureRandom;
import java.security.spec.KeySpec;

public class EncryptedClassLoader extends ClassLoader {
    private SecretKey secretKey;
    private final Cipher cipher;
    private static final String ALGORITHM = "AES";
    private static final int SALT_LENGTH = 16;
    private static final int ITERATIONS = 10000;
    private static final int KEY_LENGTH = 256;
    private static final String PBKDF2_ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final String ENCRYPTION_ALGORITHM = "AES";

    public static SecretKey generateKeyFromPassword() throws Exception {
        String password = "password";
        byte[] salt = generateSalt();
        SecretKeyFactory factory = SecretKeyFactory.getInstance(PBKDF2_ALGORITHM);
        PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, ITERATIONS, KEY_LENGTH);
        byte[] keyBytes = factory.generateSecret(spec).getEncoded();
        return new SecretKeySpec(keyBytes, ENCRYPTION_ALGORITHM);
    }

    private static byte[] generateSalt() {
        SecureRandom random = new SecureRandom();
        byte[] salt = new byte[SALT_LENGTH];
        random.nextBytes(salt);
        return salt;
    }

    public EncryptedClassLoader(ClassLoader parent) {
        super(parent);
        try {
            secretKey = EncryptedClassLoader.generateKeyFromPassword();
        }catch (Exception e) {
            e.printStackTrace();
        }
        try {
            this.cipher = Cipher.getInstance(ALGORITHM);
        } catch (Exception e) {
            throw new RuntimeException("Cipher initialization failed", e);
        }
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        try {
            String classFilePath = name.replace('.', '/') + ".java";
            InputStream encryptedStream = getResourceAsStream(classFilePath);
            if (encryptedStream == null) {
                return super.findClass(name);
            }
            byte[] encryptedBytes = readFully(encryptedStream);
            cipher.init(Cipher.DECRYPT_MODE, secretKey);
            byte[] decryptedBytes = cipher.doFinal(encryptedBytes);
            return defineClass(name, decryptedBytes, 0, decryptedBytes.length);
        } catch (Exception e) {
            e.printStackTrace();
            throw new ClassNotFoundException("Could not decrypt and load class", e);
        }
    }

    private byte[] readFully(InputStream stream) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        int length;
        while ((length = stream.read(buffer)) != -1) {
            baos.write(buffer, 0, length);
        }
        return baos.toByteArray();
    }
}
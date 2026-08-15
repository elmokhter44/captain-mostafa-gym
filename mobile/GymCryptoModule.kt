package com.captainmostafagymmobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.security.SecureRandom
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class GymCryptoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    companion object { const val NAME = "GymCrypto" }
    override fun getName(): String = NAME

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun secureRandomHex(byteCount: Int): String {
        require(byteCount > 0 && byteCount <= 1024) { "Invalid random byte count" }
        val bytes = ByteArray(byteCount)
        SecureRandom().nextBytes(bytes)
        return bytes.toHex()
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun pbkdf2(password: String, saltHex: String, iterations: Int, keyLengthBytes: Int): String {
        require(iterations > 0) { "Invalid PBKDF2 iterations" }
        require(keyLengthBytes > 0 && keyLengthBytes <= 1024) { "Invalid PBKDF2 key length" }
        val salt = hexToBytes(saltHex)
        val passwordBytes = password.toByteArray(Charsets.UTF_8)
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(passwordBytes, "HmacSHA256"))
        val hLen = mac.macLength
        val blocks = (keyLengthBytes + hLen - 1) / hLen
        val result = ByteArray(blocks * hLen)
        var outOffset = 0
        for (blockIndex in 1..blocks) {
            val block = ByteArray(salt.size + 4)
            System.arraycopy(salt, 0, block, 0, salt.size)
            block[block.size - 4] = (blockIndex ushr 24).toByte()
            block[block.size - 3] = (blockIndex ushr 16).toByte()
            block[block.size - 2] = (blockIndex ushr 8).toByte()
            block[block.size - 1] = blockIndex.toByte()
            var u = mac.doFinal(block)
            val t = u.copyOf()
            for (i in 2..iterations) {
                u = mac.doFinal(u)
                for (j in t.indices) t[j] = (t[j].toInt() xor u[j].toInt()).toByte()
            }
            System.arraycopy(t, 0, result, outOffset, t.size)
            outOffset += t.size
        }
        return result.copyOf(keyLengthBytes).toHex()
    }

    private fun hexToBytes(hex: String): ByteArray {
        require(hex.length % 2 == 0) { "Invalid hex salt" }
        return ByteArray(hex.length / 2) { i ->
            val index = i * 2
            hex.substring(index, index + 2).toInt(16).toByte()
        }
    }

    private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it.toInt() and 0xff) }
}

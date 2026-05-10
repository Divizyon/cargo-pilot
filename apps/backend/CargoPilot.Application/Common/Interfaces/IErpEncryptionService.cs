namespace CargoPilot.Application.Common.Interfaces;

public interface IErpEncryptionService
{
    string Encrypt(string plainText);
    string Decrypt(string cipherText);
}

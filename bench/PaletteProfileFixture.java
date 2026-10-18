// Optional JDK 11+ source-file helper for make-palette-diagnostic-fixtures.mjs.
// Converts FFmpeg-decoded JPEG RGB and generated paired PNG RGB through Java ICC
// color management (normally the JDK LCMS provider), preserving alpha unchanged.
// FFmpeg does not produce these managed references.
import java.awt.color.ColorSpace;
import java.awt.color.ICC_ColorSpace;
import java.awt.color.ICC_Profile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

class PaletteProfileFixture {
  public static void main(String[] args) throws Exception {
    if (args.length != 1) throw new IllegalArgumentException("Expected fixture output directory");
    Path root = Path.of(args[0]);
    ICC_Profile profile = ICC_Profile.getInstance(ColorSpace.CS_LINEAR_RGB);
    Files.write(root.resolve("linear-rgb.icc"), profile.getData(), StandardOpenOption.CREATE_NEW);
    ICC_ColorSpace space = new ICC_ColorSpace(profile);
    byte[] bytes = Files.readAllBytes(root.resolve("gradient-yuvj444p.jpg.decoded.rgba"));
    float[] input = new float[3];
    for (int p = 0; p < bytes.length; p += 4) {
      for (int c = 0; c < 3; c++) input[c] = (bytes[p + c] & 255) / 255f;
      float[] output = space.toRGB(input);
      for (int c = 0; c < 3; c++) bytes[p + c] = (byte)Math.max(0, Math.min(255, Math.round(output[c] * 255)));
    }
    Files.write(root.resolve("gradient-linear-icc.jpg.managed.rgba"), bytes, StandardOpenOption.CREATE_NEW);
    // Paired low-color PNG controls isolate alpha precision from legitimate
    // cross-CMS rounding. Their encoded RGB is identical; only alpha differs.
    Path profileDirectory = Files.createDirectory(root.resolve("profile"));
    byte[] alpha = Files.readAllBytes(root.resolve("alpha-grid.rgba"));
    for (int p = 0; p < alpha.length; p += 4) {
      for (int c = 0; c < 3; c++) input[c] = (alpha[p + c] & 255) / 255f;
      float[] output = space.toRGB(input);
      for (int c = 0; c < 3; c++) alpha[p + c] = (byte)Math.max(0, Math.min(255, Math.round(output[c] * 255)));
    }
    Files.write(profileDirectory.resolve("linear-alpha.png.managed.rgba"), alpha, StandardOpenOption.CREATE_NEW);
    for (int p = 3; p < alpha.length; p += 4) alpha[p] = (byte)255;
    Files.write(profileDirectory.resolve("linear-opaque.png.managed.rgba"), alpha, StandardOpenOption.CREATE_NEW);
    System.out.println("Wrote Java built-in linear RGB ICC and Java-managed JPEG/paired-PNG sRGB references.");
  }
}

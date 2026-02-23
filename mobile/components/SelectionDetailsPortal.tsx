import React from 'react';
import { StyleSheet, View, ScrollView, Image as RNImage, Platform } from 'react-native';
import { Text, IconButton, useTheme, Card, Button, Modal, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelection } from '@/hooks/useSelection';
import { SafeAreaView } from 'react-native-safe-area-context';

// Interface defining the expected properties the SelectionDetailsPortal takes
interface SelectionDetailsPortalProps {
  visible: boolean; // Determines whether the modal portal sits on top dynamically
  onDismiss: () => void; // A callback to close or cancel out of the modal view
}

// SelectionDetailsPortal behaves as a screen-like modal to review, manage, and delete items from an active selection queue
const SelectionDetailsPortal = ({ visible, onDismiss }: SelectionDetailsPortalProps) => {
  // Pull current global theme object for style synchronization
  const theme = useTheme();
  
  // Consume data context containing currently selected items, total size computed, and array modifiers 
  const { selectedItems, removeItem, clearSelection, totalSize } = useSelection();

  // Helper function safely scaling a byte count into MB, KB, etc. with math abstractions
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024; // Kilobyte threshold multiplier scale
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    // Solve the magnitude scale logically to apply to the sizes array index
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Provide a cleanly spaced string truncated to 1 place decimal
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Switch statement function evaluating the known abstract file type and spitting back a Material icon name
  const getIcon = (type: string) => {
    switch (type) {
      case 'media':
        return 'image-outline';
      case 'text':
        return 'text-short';
      case 'app':
        return 'apps';
      case 'folder':
        return 'folder-outline';
      default:
        return 'file-outline';
    }
  };

  return (
    // React Native Paper layout wrapper ensuring this modal escapes relative hierarchies and renders on top of the DOM
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { backgroundColor: theme.colors.background }, // Connect global themed color safely
        ]}
      >
        {/* Bounds UI effectively from intruding on gesture controls or hardware cutouts */}
        <SafeAreaView style={styles.safeArea} edges={['bottom']}>
          <View style={styles.container}>
            
            {/* Nav Header Area rendering a title context and a backward exit button */}
            <View style={[styles.appBar, { marginTop: Platform.OS === 'android' ? 8 : 0 }]}>
              <IconButton
                icon="arrow-left"
                size={24}
                onPress={onDismiss}
                iconColor={theme.colors.onSurface}
              />
              <Text
                variant="headlineSmall"
                style={[styles.title, { color: theme.colors.onSurface }]}
              >
                Selection
              </Text>
            </View>

            {/* Action Bar for clearing and general text-based selection metadata */}
            <View style={styles.buttonRow}>
              <View style={styles.statsInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                  {selectedItems.length} items ({formatSize(totalSize)})
                </Text>
              </View>
              {/* Wipe all function executed directly on click */}
              <Button
                mode="contained-tonal"
                icon="delete-sweep"
                onPress={clearSelection}
                style={styles.clearButton}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                disabled={selectedItems.length === 0} // Lock if there's nothing available to wipe
              >
                Clear all
              </Button>
            </View>

            {/* Main view container where files dynamically mapped are populated in standard scrolling lists */}
            <ScrollView contentContainerStyle={styles.listContent} style={styles.scrollView}>
              {/* Loop iterating through the items, generating a distinct row for each file explicitly bound to its Id property */}
              {selectedItems.map((item) => (
                <Card key={item.id} style={styles.itemCard} mode="contained">
                  <View style={styles.itemRow}>
                    
                    {/* Visual presentation block. Prioritizes thumbnail images or falls over dynamically to generic file icons */}
                    <View style={styles.thumbnailWrapper}>
                      {item.type === 'media' && item.uri ? (
                        <RNImage source={{ uri: item.uri }} style={styles.thumbnail} />
                      ) : (
                        <View
                          style={[
                            styles.iconPlaceholder,
                            { backgroundColor: theme.colors.surfaceVariant },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={getIcon(item.type) as any}
                            size={28}
                            color={theme.colors.primary}
                          />
                        </View>
                      )}
                    </View>

                    {/* Metadata text label grouping formatting the file label strings */}
                    <View style={styles.itemInfo}>
                      <Text
                        variant="bodyLarge"
                        numberOfLines={1}
                        style={[styles.itemName, { color: theme.colors.onSurface }]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        variant="labelMedium"
                        style={[styles.itemSize, { color: theme.colors.onSurfaceVariant }]}
                      >
                        {formatSize(item.size)}
                      </Text>
                    </View>

                    {/* Simple cross button mapped directly to erase specifically this mapped iterative element from state */}
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => removeItem(item.id)}
                      iconColor={theme.colors.onSurfaceVariant}
                    />
                  </View>
                </Card>
              ))}

              {/* Explicit placeholder text when list effectively clears back to 0 */}
              {selectedItems.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text
                    variant="headlineSmall"
                    style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
                  >
                    No items selected.
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Static button fixed to the bottom allowing closure to effectively lock the chosen selections */}
            <View style={styles.footer}>
              <Button
                mode="contained"
                onPress={onDismiss}
                style={styles.confirmButton}
                contentStyle={{ height: 56 }}
                labelStyle={{ fontSize: 16, fontWeight: '700' }}
              >
                Confirm Selection
              </Button>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </Portal>
  );
};

// Segregated styling object separating styling declarations completely from rendering logics. 
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1, // Utilize full absolute bounds cleanly under Android and iOS configurations
    margin: 0,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    height: 44,
  },
  title: {
    marginLeft: 8,
    fontWeight: '400',
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center', // Fix vertical alignment of the text context and the wipe button alongside
    justifyContent: 'space-between', // Ensures space effectively expands evenly pushing to bounding edges
    marginVertical: 4,
  },
  statsInfo: {
    flex: 1, // Dominates lateral width pushing buttons
  },
  clearButton: {
    borderRadius: 20,
  },
  buttonContent: {
    height: 40,
  },
  buttonLabel: {
    fontSize: 12,
  },
  scrollView: {
    flex: 1, // Expands fully without clipping content outside defined boundary nodes
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24, // Keeps margin safety to alleviate clipping over edges near bottoms
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)', // Barely visible translucency
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12, // Substantial internal structural padding effectively expanding element interaction points cleanly
  },
  thumbnailWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Subtle drop shadowing under thumbnails ensures float visual separation visually gracefully
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: {
    width: 48, // Defined block constants effectively keep rendered image aspect sizes static explicitly
    height: 48,
    borderRadius: 10, // Smooth radius softening
  },
  iconPlaceholder: {
    width: 48, // Placeholder identically constrained visually to exactly emulate full images seamlessly
    height: 48,
    borderRadius: 12,
    justifyContent: 'center', // Axis 1 50% boundary center
    alignItems: 'center', // Axis 2 50% boundary center structurally
  },
  itemInfo: {
    flex: 1, // Dominates middle available spacing area explicitly pulling elements toward the trailing action node laterally broadly
    marginLeft: 16,
  },
  itemName: {
    fontWeight: '600',
  },
  itemSize: {
    opacity: 0.7, // Text opacity cleanly lowered creating natural informational hierarchies softly
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: 100, // Forces downward centering implicitly across standard screens efficiently
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.7,
    fontWeight: '400',
    textAlign: 'center', // Align empty notifications dead center
  },
  footer: {
    padding: 16,
  },
  confirmButton: {
    borderRadius: 28, // Round edges of confirmation element
  },
});

export default SelectionDetailsPortal;
